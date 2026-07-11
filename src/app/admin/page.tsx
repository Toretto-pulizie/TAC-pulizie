import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { computeTotals, formatMinutes, pairSessions } from "@/lib/timeCalc";
import { toDateInputValue } from "@/lib/dates";
import { AdminNav } from "./AdminNav";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; userId?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const today = new Date();
  const defaultFrom = new Date(today);
  defaultFrom.setDate(defaultFrom.getDate() - 6);

  const from = params.from ? new Date(params.from) : defaultFrom;
  from.setHours(0, 0, 0, 0);
  const to = params.to ? new Date(params.to) : today;
  to.setHours(23, 59, 59, 999);

  const [employees, entries] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: "asc" } }),
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

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="dashboard" />
      <div className="flex flex-col gap-6 p-4 sm:p-8">
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
            Dipendente
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

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {employees
            .filter((e) => !params.userId || e.id === params.userId)
            .map((e) => {
              const t = totals.get(e.id) ?? { travelMinutes: 0, workMinutes: 0 };
              return (
                <div
                  key={e.id}
                  className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
                >
                  <p className="font-medium text-zinc-900">{e.name}</p>
                  <div className="mt-2 flex gap-4 text-sm">
                    <div>
                      <p className="text-zinc-500">Lavoro</p>
                      <p className="font-semibold text-zinc-900">
                        {formatMinutes(t.workMinutes)}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Spostamento</p>
                      <p className="font-semibold text-zinc-900">
                        {formatMinutes(t.travelMinutes)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
        </section>

        <section className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Dipendente</th>
                <th className="px-4 py-3 font-medium">Cliente / cantiere</th>
                <th className="px-4 py-3 font-medium">Inizio lavoro</th>
                <th className="px-4 py-3 font-medium">Fine lavoro</th>
                <th className="px-4 py-3 font-medium">GPS</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s, i) => (
                <tr key={i} className="border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-3">{s.user.name}</td>
                  <td className="px-4 py-3 text-zinc-500">
                    {s.site ? `${s.site.client.name} — ${s.site.name}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {s.start.toLocaleString("it-IT")}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {s.end ? s.end.toLocaleString("it-IT") : "In corso"}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {s.lat && s.lng ? "✓" : "—"}
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-zinc-400">
                    Nessuna timbratura nel periodo selezionato.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
