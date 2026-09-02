import Link from "next/link";
import { redirect } from "next/navigation";
import { verifySession, getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import type { EntryType } from "@prisma/client";
import { startOfToday, computeSiteTotals } from "@/lib/timeCalc";
import {
  startOfDay,
  endOfDay,
  formatDateLabel,
  formatTime,
  monthRange,
} from "@/lib/dates";
import { TIPO_LABELS } from "@/lib/leaveRequests";
import { isModuleKey } from "@/lib/modules";
import { getHomeSettings } from "@/lib/homeSettings";

function formatEuro(n: number) {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

type Segment = {
  label: string;
  count: number;
  color: string;
  display?: string;
};

function SimpleStatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-3xl font-semibold text-zinc-900">{value}</p>
      <p className="mt-1 text-sm text-zinc-500">{label}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  segments,
  showBar = true,
}: {
  label: string;
  value: string | number;
  segments: readonly Segment[];
  showBar?: boolean;
}) {
  const total = segments.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-3xl font-semibold text-zinc-900">{value}</p>
      <p className="mt-1 text-sm text-zinc-500">{label}</p>

      {showBar && total > 0 && (
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
                {s.label} {s.display ?? s.count}
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

  const [activeEmployees, todayEntries, quotesByStatus, homeSettings] =
    await Promise.all([
      prisma.user.count({ where: { active: true, role: "EMPLOYEE" } }),
      prisma.timeEntry.findMany({
        where: { timestamp: { gte: startOfToday() } },
        orderBy: { timestamp: "asc" },
        select: { userId: true, type: true },
      }),
      prisma.quote.groupBy({ by: ["status"], _count: true }),
      getHomeSettings(),
    ]);

  const lastStatusByUser = new Map<string, string>();
  for (const e of todayEntries) lastStatusByUser.set(e.userId, e.type);
  const statuses = [...lastStatusByUser.values()];
  const atWork = statuses.filter((t) => t === "WORK_START").length;
  const traveling = statuses.filter((t) => t === "TRAVEL_START").length;
  const free = activeEmployees - atWork - traveling;

  const quoteCount = (status: string) =>
    quotesByStatus.find((r) => r.status === status)?._count ?? 0;

  const cards = (
    [
      {
        moduleKey: "timbrature",
        settingKey: "showAlLavoro",
        label: "Al lavoro adesso",
        value: atWork,
        showBar: homeSettings.showAlLavoroBar,
        segments: [
          { label: "Al lavoro", count: atWork, color: "bg-emerald-500" },
          { label: "In spostamento", count: traveling, color: "bg-amber-400" },
          { label: "Liberi", count: free, color: "bg-zinc-300" },
        ],
      },
      {
        moduleKey: "preventivi",
        settingKey: "showPreventivi",
        label: "Preventivi in trattativa",
        value: quoteCount("IN_TRATTATIVA"),
        showBar: homeSettings.showPreventiviBar,
        segments: [
          { label: "In trattativa", count: quoteCount("IN_TRATTATIVA"), color: "bg-amber-400" },
          { label: "Accettati", count: quoteCount("ACCETTATO"), color: "bg-emerald-500" },
          { label: "Rifiutati", count: quoteCount("RIFIUTATO"), color: "bg-rose-400" },
        ],
      },
    ] as const
  ).filter(
    (c) => (isAdmin || allowed.has(c.moduleKey)) && homeSettings[c.settingKey]
  );

  const showShifts =
    (isAdmin || allowed.has("pianificazione")) && homeSettings.showTurni;
  const showPendingLeave =
    (isAdmin || allowed.has("permessi")) && homeSettings.showPermessi;
  const showTotalePreventivi =
    (isAdmin || allowed.has("preventivi")) &&
    homeSettings.showTotalePreventiviAccettati;
  const showTotaleConsuntivi =
    (isAdmin || allowed.has("consuntivi")) && homeSettings.showTotaleConsuntivi;

  const { start: monthStart, end: monthEnd } = monthRange(
    new Date().getFullYear(),
    new Date().getMonth() + 1
  );

  const [todayShifts, pendingRequests, acceptedQuotes, monthEntries] =
    await Promise.all([
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
    showTotalePreventivi
      ? prisma.quote.findMany({
          where: { status: "ACCETTATO" },
          select: { prezzoVenduto: true },
        })
      : Promise.resolve([]),
    showTotaleConsuntivi
      ? Promise.all([
          prisma.quote.findMany({
            where: { status: "ACCETTATO" },
            select: { siteId: true, tariffaConsuntivo: true, prezzoVenduto: true },
          }),
          prisma.timeEntry.findMany({
            where: { timestamp: { gte: monthStart, lte: monthEnd } },
            select: { userId: true, siteId: true, type: true, timestamp: true },
          }),
        ])
      : Promise.resolve([[], []] as [
          { siteId: string; tariffaConsuntivo: number; prezzoVenduto: number | null }[],
          { userId: string; siteId: string | null; type: EntryType; timestamp: Date }[],
        ]),
  ]);

  const totalePreventiviAccettati = acceptedQuotes.reduce(
    (sum, q) => sum + (q.prezzoVenduto ?? 0),
    0
  );

  const [consuntivoQuotes, consuntivoEntries] = monthEntries;
  const consuntivoSiteTotals = computeSiteTotals(consuntivoEntries);
  let totaleConsuntivo = 0;
  let consuntivoInUtile = 0;
  let consuntivoInPerdita = 0;
  for (const q of consuntivoQuotes) {
    const totals = consuntivoSiteTotals.get(q.siteId) ?? {
      travelMinutes: 0,
      workMinutes: 0,
    };
    const euroConsuntivo = (totals.workMinutes / 60) * q.tariffaConsuntivo;
    totaleConsuntivo += euroConsuntivo;
    if (euroConsuntivo >= (q.prezzoVenduto ?? 0)) {
      consuntivoInUtile += euroConsuntivo;
    } else {
      consuntivoInPerdita += euroConsuntivo;
    }
  }

  return (
    <div className="flex flex-col gap-8 p-4 sm:p-8">
      <div>
        <p className="text-sm text-zinc-500">Ciao,</p>
        <h1 className="text-2xl font-semibold text-zinc-900">
          {session.name}
        </h1>
      </div>

      {(cards.length > 0 || showTotalePreventivi || showTotaleConsuntivi) && (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <StatCard
              key={c.label}
              label={c.label}
              value={c.value}
              segments={c.segments}
              showBar={c.showBar}
            />
          ))}
          {showTotalePreventivi && (
            <SimpleStatCard
              label="Totale preventivi accettati"
              value={formatEuro(totalePreventiviAccettati)}
            />
          )}
          {showTotaleConsuntivi && (
            <StatCard
              label="Totale consuntivi (mese)"
              value={formatEuro(totaleConsuntivo)}
              showBar={homeSettings.showTotaleConsuntiviBar}
              segments={[
                {
                  label: "In utile",
                  count: consuntivoInUtile,
                  color: "bg-emerald-500",
                  display: formatEuro(consuntivoInUtile),
                },
                {
                  label: "In perdita",
                  count: consuntivoInPerdita,
                  color: "bg-rose-400",
                  display: formatEuro(consuntivoInPerdita),
                },
              ]}
            />
          )}
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
