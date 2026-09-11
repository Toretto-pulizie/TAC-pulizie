import { requireModule } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { computeTotals, pairSessions } from "@/lib/timeCalc";
import { toDateInputValue } from "@/lib/dates";
import { TimbratureGrid, type SessionRow, type EmployeeTotal } from "./TimbratureGrid";

export default async function TimbraturePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; userId?: string }>;
}) {
  await requireModule("timbrature");
  const params = await searchParams;

  const today = new Date();
  const defaultFrom = new Date(today);
  defaultFrom.setDate(defaultFrom.getDate() - 6);

  const from = params.from ? new Date(params.from) : defaultFrom;
  from.setHours(0, 0, 0, 0);
  const to = params.to ? new Date(params.to) : today;
  to.setHours(23, 59, 59, 999);

  const [employees, sites, entries] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: "asc" } }),
    prisma.site.findMany({ include: { client: true }, orderBy: { name: "asc" } }),
    prisma.timeEntry.findMany({
      where: {
        timestamp: { gte: from, lte: to },
        ...(params.userId ? { userId: params.userId } : {}),
      },
      include: { user: true, site: { include: { client: true } } },
      orderBy: { timestamp: "desc" },
    }),
  ]);

  const totals = computeTotals(entries);
  const sessions = pairSessions(entries);

  const employeeTotals: EmployeeTotal[] = employees
    .filter((e) => !params.userId || e.id === params.userId)
    .map((e) => {
      const t = totals.get(e.id) ?? { travelMinutes: 0, workMinutes: 0 };
      return { userId: e.id, name: e.name, workMinutes: t.workMinutes, travelMinutes: t.travelMinutes };
    });

  const sessionRows: SessionRow[] = sessions.map((s) => ({
    startId: s.startId,
    endId: s.endId,
    travelId: s.travelId,
    userName: s.user.name,
    clientName: s.site?.client.name ?? null,
    siteName: s.site?.name ?? null,
    dateLabel: s.start.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" }),
    startTime: s.start.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
    endTime: s.end
      ? s.end.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
      : null,
    startEstimated: s.startEstimated,
    endEstimated: s.endEstimated,
    workMinutes: s.end ? Math.round((s.end.getTime() - s.start.getTime()) / 60000) : null,
    travelMinutes: s.travelMinutes,
    gps: s.lat != null && s.lng != null,
    note: s.note ?? "",
  }));

  return (
    <div className="flex flex-col gap-6 px-4 py-4 sm:px-8 sm:py-8">
      <form className="flex flex-wrap items-end gap-3" method="get">
        <label className="flex flex-col gap-1 text-sm">
          Da
          <input
            type="date"
            name="from"
            defaultValue={toDateInputValue(from)}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          A
          <input
            type="date"
            name="to"
            defaultValue={toDateInputValue(to)}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Collaboratore
          <select
            name="userId"
            defaultValue={params.userId ?? ""}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          >
            <option value="">Tutti</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Filtra
        </button>
      </form>

      <TimbratureGrid
        sessions={sessionRows}
        employeeTotals={employeeTotals}
        employees={employees.map((e) => ({ id: e.id, name: e.name }))}
        sites={sites.map((s) => ({ id: s.id, label: `${s.client.name} — ${s.name}` }))}
      />
    </div>
  );
}
