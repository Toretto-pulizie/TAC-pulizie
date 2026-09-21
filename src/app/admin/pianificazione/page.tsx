import Link from "next/link";
import { requireModule } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import {
  addDays,
  endOfDay,
  formatDateLabel,
  startOfWeek,
  toDateInputValue,
} from "@/lib/dates";
import { cadenzaLabel } from "@/lib/quotePrint";
import { clientDisplayName } from "@/lib/clients";
import { getServiceTypeLabels } from "@/lib/serviceTypeLabels";
import { PianificazioneCalendar } from "./PianificazioneCalendar";
import { ShiftPlanRow } from "./ShiftPlanRow";
import { PianificazionePageActions } from "./PianificazionePageActions";

export default async function PianificazionePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  await requireModule("pianificazione");
  const params = await searchParams;

  const reference = params.week ? new Date(params.week) : new Date();
  const weekStart = startOfWeek(reference);
  const weekEnd = endOfDay(addDays(weekStart, 6));
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const [
    employees,
    sites,
    shifts,
    shiftPlans,
    continuativeQuoteSites,
    allAcceptedQuoteSites,
    serviceTypeLabels,
  ] = await Promise.all([
      prisma.user.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
      }),
      prisma.site.findMany({
        include: { client: true },
      }),
      prisma.shift.findMany({
        where: { start: { gte: weekStart, lte: weekEnd } },
        include: { user: true, site: { include: { client: true } } },
        orderBy: { start: "asc" },
      }),
      prisma.shiftPlan.findMany({
        include: { user: true, site: { include: { client: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.quoteSite.findMany({
        where: {
          quote: { status: "ACCETTATO" },
          serviceType: { not: "ONE_SHOT" },
        },
        include: { site: { include: { client: true } } },
      }),
      // Tutti i preventivi/servizi accettati di ogni sede (qualunque tipo,
      // compreso "una tantum"): proposti nel modulo turno come scelta
      // esplicita quando si assegnano più collaboratori insieme, così le
      // ore per suddividere il tempo vengono sempre da un preventivo
      // preciso e non indovinate — una sede può avere più contratti nel
      // tempo (es. prima settimanale poi mensile) o più righe.
      prisma.quoteSite.findMany({
        where: { quote: { status: "ACCETTATO" } },
        select: {
          id: true,
          siteId: true,
          ore: true,
          serviceType: true,
          oneShotCount: true,
          passSettimanale: true,
          passMensile: true,
        },
      }),
      getServiceTypeLabels(),
    ]);

  sites.sort((a, b) => {
    const byClient = clientDisplayName(a.client).localeCompare(clientDisplayName(b.client), "it");
    return byClient !== 0 ? byClient : a.name.localeCompare(b.name, "it");
  });

  const quoteSitesBySite = new Map<string, { id: string; ore: number; label: string }[]>();
  for (const qs of allAcceptedQuoteSites) {
    const list = quoteSitesBySite.get(qs.siteId) ?? [];
    list.push({
      id: qs.id,
      ore: qs.ore,
      label: `${cadenzaLabel(qs.serviceType, qs.oneShotCount, qs.passSettimanale, qs.passMensile)} — ${qs.ore}h/intervento`,
    });
    quoteSitesBySite.set(qs.siteId, list);
  }

  // Più collaboratori sullo stesso turno condividono lo stesso groupId
  // (stessa sede/data/orario per costruzione): li raggruppiamo in un unico
  // blocco per il calendario invece di uno per collaboratore.
  const shiftsByGroup = new Map<string, typeof shifts>();
  for (const s of shifts) {
    const list = shiftsByGroup.get(s.groupId) ?? [];
    list.push(s);
    shiftsByGroup.set(s.groupId, list);
  }
  const groupedShiftItems = Array.from(shiftsByGroup.values()).map((members) => {
    const first = members[0];
    return {
      groupId: first.groupId,
      start: first.start,
      end: first.end,
      siteId: first.siteId,
      siteLabel: `${clientDisplayName(first.site.client)} — ${first.site.name}`,
      notes: first.notes,
      members: members.map((m) => ({
        shiftId: m.id,
        userId: m.userId,
        employeeName: m.user.name,
      })),
    };
  });

  const shiftsByDay = days.map((day) =>
    groupedShiftItems.filter((g) => g.start.toDateString() === day.toDateString())
  );

  const DEFAULT_START_HOUR = 7;
  const DEFAULT_END_HOUR = 20;
  const shiftHours = shifts.flatMap((s) => [
    s.start.getHours(),
    s.end.getHours() + (s.end.getMinutes() > 0 ? 1 : 0),
  ]);
  const startHour = Math.min(DEFAULT_START_HOUR, ...shiftHours);
  const endHour = Math.max(DEFAULT_END_HOUR, ...shiftHours);

  const prevWeek = toDateInputValue(addDays(weekStart, -7));
  const nextWeek = toDateInputValue(addDays(weekStart, 7));

  const occupancy: Record<string, Record<string, number>> = {};
  for (const day of days) {
    const dateStr = toDateInputValue(day);
    const dayShifts = shifts.filter(
      (s) => s.start.toDateString() === day.toDateString()
    );
    const bySite = new Map<string, Set<string>>();
    for (const s of dayShifts) {
      const set = bySite.get(s.siteId) ?? new Set<string>();
      set.add(s.userId);
      bySite.set(s.siteId, set);
    }
    for (const [siteId, userSet] of bySite) {
      occupancy[siteId] = occupancy[siteId] ?? {};
      occupancy[siteId][dateStr] = userSet.size;
    }
  }

  const shiftPlanItems = shiftPlans.map((p) => ({
    id: p.id,
    employeeName: p.user.name,
    siteLabel: `${clientDisplayName(p.site.client)} — ${p.site.name}`,
    daysOfWeek: p.daysOfWeek,
    intervalWeeks: p.intervalWeeks,
    intervalDays: p.intervalDays,
    startTime: p.startTime,
    endTime: p.endTime,
    dataInizioLabel: p.dataInizio.toLocaleDateString("it-IT"),
    dataFineLabel: p.dataFine ? p.dataFine.toLocaleDateString("it-IT") : null,
  }));

  const quoteSiteOptions = continuativeQuoteSites
    .map((qs) => ({
      id: qs.id,
      siteId: qs.siteId,
      serviceType: qs.serviceType,
      ore: qs.ore,
      label: `${clientDisplayName(qs.site.client)} — ${qs.site.name} (${cadenzaLabel(qs.serviceType, qs.oneShotCount, qs.passSettimanale, qs.passMensile)})`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "it"));

  return (
    <div className="flex flex-col gap-6 px-4 py-4 sm:px-8 sm:py-8">
        <PianificazionePageActions
          employees={employees.map((e) => ({ id: e.id, name: e.name }))}
          sites={sites.map((s) => ({
            id: s.id,
            label: `${clientDisplayName(s.client)} — ${s.name}`,
          }))}
          quoteSites={quoteSiteOptions}
          frequenzaLabels={{
            settimanale: serviceTypeLabels.PASS_SETTIMANALE,
            mensile: serviceTypeLabels.PASS_MENSILE,
          }}
        />

        {shiftPlanItems.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-zinc-700">
              Turni ricorrenti attivi
            </p>
            <ul className="flex flex-col gap-2">
              {shiftPlanItems.map((p) => (
                <ShiftPlanRow key={p.id} plan={p} />
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-between">
          <Link
            href={`/admin/pianificazione?week=${prevWeek}`}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            ← Settimana precedente
          </Link>
          <p className="text-sm font-medium text-zinc-600">
            {formatDateLabel(weekStart)} – {formatDateLabel(days[6])}
          </p>
          <Link
            href={`/admin/pianificazione?week=${nextWeek}`}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            Settimana successiva →
          </Link>
        </div>

        <PianificazioneCalendar
          employees={employees.map((e) => ({ id: e.id, name: e.name }))}
          sites={sites.map((s) => ({
            id: s.id,
            label: `${clientDisplayName(s.client)} — ${s.name}`,
            capienza: s.capienza,
            quoteSites: quoteSitesBySite.get(s.id) ?? [],
          }))}
          occupancy={occupancy}
          defaultDate={toDateInputValue(reference)}
          days={days}
          shiftsByDay={shiftsByDay}
          startHour={startHour}
          endHour={endHour}
        />
    </div>
  );
}
