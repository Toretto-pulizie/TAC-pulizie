import Link from "next/link";
import { redirect } from "next/navigation";
import { verifySession, getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { startOfToday } from "@/lib/timeCalc";
import { startOfDay, endOfDay, formatDateLabel, formatTime } from "@/lib/dates";
import { TIPO_LABELS } from "@/lib/leaveRequests";
import { isModuleKey } from "@/lib/modules";

type Segment = { label: string; count: number; color: string };

function StatCard({
  label,
  value,
  segments,
}: {
  label: string;
  value: number;
  segments: readonly Segment[];
}) {
  const total = segments.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-3xl font-semibold text-zinc-900">{value}</p>
      <p className="mt-1 text-sm text-zinc-500">{label}</p>

      {total > 0 && (
        <>
          <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-zinc-100">
            {segments
              .filter((s) => s.count > 0)
              .map((s) => (
                <div
                  key={s.label}
                  className={s.color}
                  style={{ width: `${(s.count / total) * 100}%` }}
                />
              ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {segments.map((s) => (
              <span
                key={s.label}
                className="flex items-center gap-1.5 text-xs text-zinc-500"
              >
                <span className={`h-2 w-2 rounded-full ${s.color}`} />
                {s.label} {s.count}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default async function AdminHomePage() {
  const session = await verifySession();
  const user = await getCurrentUser();
  const isAdmin = session.role === "ADMIN";
  const allowed = new Set(user?.allowedModules.filter(isModuleKey) ?? []);

  if (!isAdmin && allowed.size === 0) {
    redirect("/dipendente");
  }

  const [activeEmployees, todayEntries, leaveByStatus, quotesByStatus] =
    await Promise.all([
      prisma.user.count({ where: { active: true, role: "EMPLOYEE" } }),
      prisma.timeEntry.findMany({
        where: { timestamp: { gte: startOfToday() } },
        orderBy: { timestamp: "asc" },
        select: { userId: true, type: true },
      }),
      prisma.leaveRequest.groupBy({ by: ["stato"], _count: true }),
      prisma.quote.groupBy({ by: ["status"], _count: true }),
    ]);

  const lastStatusByUser = new Map<string, string>();
  for (const e of todayEntries) lastStatusByUser.set(e.userId, e.type);
  const statuses = [...lastStatusByUser.values()];
  const atWork = statuses.filter((t) => t === "WORK_START").length;
  const traveling = statuses.filter((t) => t === "TRAVEL_START").length;
  const free = activeEmployees - atWork - traveling;

  const leaveCount = (stato: string) =>
    leaveByStatus.find((r) => r.stato === stato)?._count ?? 0;
  const quoteCount = (status: string) =>
    quotesByStatus.find((r) => r.status === status)?._count ?? 0;

  const cards = (
    [
      {
        moduleKey: "timbrature",
        label: "Al lavoro adesso",
        value: atWork,
        segments: [
          { label: "Al lavoro", count: atWork, color: "bg-emerald-500" },
          { label: "In spostamento", count: traveling, color: "bg-amber-400" },
          { label: "Liberi", count: free, color: "bg-zinc-300" },
        ],
      },
      {
        moduleKey: "permessi",
        label: "Permessi in attesa",
        value: leaveCount("IN_ATTESA"),
        segments: [
          { label: "In attesa", count: leaveCount("IN_ATTESA"), color: "bg-amber-400" },
          { label: "Approvati", count: leaveCount("APPROVATO"), color: "bg-emerald-500" },
          { label: "Rifiutati", count: leaveCount("RIFIUTATO"), color: "bg-rose-400" },
        ],
      },
      {
        moduleKey: "preventivi",
        label: "Preventivi in trattativa",
        value: quoteCount("IN_TRATTATIVA"),
        segments: [
          { label: "In trattativa", count: quoteCount("IN_TRATTATIVA"), color: "bg-amber-400" },
          { label: "Accettati", count: quoteCount("ACCETTATO"), color: "bg-emerald-500" },
          { label: "Rifiutati", count: quoteCount("RIFIUTATO"), color: "bg-rose-400" },
        ],
      },
    ] as const
  ).filter((c) => isAdmin || allowed.has(c.moduleKey));

  const showShifts = isAdmin || allowed.has("pianificazione");
  const showPendingLeave = isAdmin || allowed.has("permessi");

  const [todayShifts, pendingRequests] = await Promise.all([
    showShifts
      ? prisma.shift.findMany({
          where: { start: { gte: startOfDay(new Date()), lte: endOfDay(new Date()) } },
          include: { user: true, site: { include: { client: true } } },
          orderBy: { start: "asc" },
        })
      : Promise.resolve([]),
    showPendingLeave
      ? prisma.leaveRequest.findMany({
          where: { stato: "IN_ATTESA" },
          include: { user: true },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-8 p-4 sm:p-8">
      <div>
        <p className="text-sm text-zinc-500">Ciao,</p>
        <h1 className="text-2xl font-semibold text-zinc-900">
          {session.name}
        </h1>
      </div>

      {cards.length > 0 && (
        <section className="grid gap-3 sm:grid-cols-3">
          {cards.map((c) => (
            <StatCard
              key={c.label}
              label={c.label}
              value={c.value}
              segments={c.segments}
            />
          ))}
        </section>
      )}

      {(showShifts || showPendingLeave) && (
        <section className="grid gap-5 lg:grid-cols-2">
          {showShifts && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium tracking-wide text-zinc-400 uppercase">
                Turni di oggi
              </p>
              <div className="rounded-xl border border-zinc-200 bg-white">
                {todayShifts.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-zinc-400">
                    Nessun turno pianificato per oggi.
                  </p>
                ) : (
                  <ul className="divide-y divide-zinc-100">
                    {todayShifts.map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                      >
                        <div>
                          <p className="font-medium text-zinc-900">
                            {s.user.name}
                          </p>
                          <p className="text-zinc-500">
                            {s.site.client.name} — {s.site.name}
                          </p>
                        </div>
                        <p className="shrink-0 text-zinc-500">
                          {formatTime(s.start)} – {formatTime(s.end)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {showPendingLeave && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium tracking-wide text-zinc-400 uppercase">
                Permessi in attesa
              </p>
              <div className="rounded-xl border border-zinc-200 bg-white">
                {pendingRequests.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-zinc-400">
                    Nessuna richiesta in attesa.
                  </p>
                ) : (
                  <ul className="divide-y divide-zinc-100">
                    {pendingRequests.map((r) => (
                      <li key={r.id}>
                        <Link
                          href="/admin/permessi"
                          className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-zinc-50"
                        >
                          <div>
                            <p className="font-medium text-zinc-900">
                              {r.user.name}
                            </p>
                            <p className="text-zinc-500">
                              {TIPO_LABELS[r.tipo]}
                            </p>
                          </div>
                          <p className="shrink-0 text-zinc-500">
                            {r.dataFine.getTime() !== r.dataInizio.getTime()
                              ? `${formatDateLabel(r.dataInizio)} – ${formatDateLabel(r.dataFine)}`
                              : formatDateLabel(r.dataInizio)}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
