import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, startOfWeek, addDays, monthRange } from "@/lib/dates";
import { clientDisplayName } from "@/lib/clients";
import { haversineKm } from "@/lib/geo";

type ConflictInput = {
  userIds: string[];
  siteId: string;
  start: Date;
  end: Date;
  excludeShiftIds?: string[];
};

export type ShiftConflicts = {
  overlaps: {
    id: string;
    groupId: string;
    userId: string;
    employeeName: string;
    start: Date;
    end: Date;
    siteLabel: string;
  }[];
  capacityWarning: { current: number; capienza: number } | null;
  budgetWarning: {
    tipo: "PASS_SETTIMANALE" | "PASS_MENSILE" | "ONE_SHOT";
    pianificate: number;
    contrattuali: number;
  } | null;
  distanceInfos: { userId: string; employeeName: string; km: number; altraSedeLabel: string }[];
};

function hoursBetween(start: Date, end: Date) {
  return (end.getTime() - start.getTime()) / 3600000;
}

// Riepilogo dei potenziali conflitti prima di scrivere uno o più turni
// (nuovi, spostati o assegnati a più collaboratori insieme sullo stesso
// cantiere): sovrapposizione oraria per ciascun collaboratore coinvolto,
// capienza della sede, ore pianificate vs monte ore contrattuale del
// preventivo accettato (ore per intervento × interventi/settimana o mese,
// oppure × interventi totali per "una tantum" — non il numero di interventi
// da solo), e distanza dalla sede di un altro turno dello stesso
// collaboratore nello stesso giorno. Sono tutti avvisi informativi, non
// bloccanti — l'amministratore decide se procedere comunque.
export async function detectShiftConflicts({
  userIds,
  siteId,
  start,
  end,
  excludeShiftIds,
}: ConflictInput): Promise<ShiftConflicts> {
  const excludeFilter =
    excludeShiftIds && excludeShiftIds.length > 0 ? { notIn: excludeShiftIds } : undefined;

  const [overlapsRaw, site, dayShiftsAtSite, sameDayOtherSiteShifts, acceptedQuoteSite] =
    await Promise.all([
      prisma.shift.findMany({
        where: {
          userId: { in: userIds },
          id: excludeFilter,
          start: { lt: end },
          end: { gt: start },
        },
        include: { site: { include: { client: true } }, user: true },
        orderBy: { start: "asc" },
      }),
      prisma.site.findUnique({
        where: { id: siteId },
        select: { capienza: true, lat: true, lng: true },
      }),
      prisma.shift.findMany({
        where: {
          siteId,
          id: excludeFilter,
          start: { gte: startOfDay(start), lte: endOfDay(start) },
        },
        select: { userId: true },
      }),
      prisma.shift.findMany({
        where: {
          userId: { in: userIds },
          id: excludeFilter,
          siteId: { not: siteId },
          start: { gte: startOfDay(start), lte: endOfDay(start) },
        },
        include: { site: { include: { client: true } }, user: true },
      }),
      prisma.quoteSite.findFirst({
        where: { siteId, quote: { status: "ACCETTATO" } },
      }),
    ]);

  const overlaps = overlapsRaw.map((s) => ({
    id: s.id,
    groupId: s.groupId,
    userId: s.userId,
    employeeName: s.user.name,
    start: s.start,
    end: s.end,
    siteLabel: `${clientDisplayName(s.site.client)} — ${s.site.name}`,
  }));

  const capacityWarning =
    site?.capienza != null
      ? {
          current: new Set(dayShiftsAtSite.map((s) => s.userId)).size,
          capienza: site.capienza,
        }
      : null;

  let budgetWarning: ShiftConflicts["budgetWarning"] = null;
  if (acceptedQuoteSite) {
    // Ogni collaboratore assegnato in parallelo su questo turno contribuisce
    // per intero alle ore-persona dell'intervento: 3 collaboratori per 2h
    // valgono 6 ore-persona, non 2.
    const newPersonHours = hoursBetween(start, end) * userIds.length;

    if (acceptedQuoteSite.serviceType === "PASS_SETTIMANALE") {
      const weekStart = startOfWeek(start);
      const weekEnd = endOfDay(addDays(weekStart, 6));
      const existing = await prisma.shift.findMany({
        where: { siteId, id: excludeFilter, start: { gte: weekStart, lte: weekEnd } },
        select: { start: true, end: true },
      });
      budgetWarning = {
        tipo: "PASS_SETTIMANALE",
        pianificate: existing.reduce((s, sh) => s + hoursBetween(sh.start, sh.end), newPersonHours),
        contrattuali: acceptedQuoteSite.ore * (acceptedQuoteSite.passSettimanale ?? 0),
      };
    } else if (acceptedQuoteSite.serviceType === "PASS_MENSILE") {
      const { start: monthStart, end: monthEnd } = monthRange(
        start.getFullYear(),
        start.getMonth() + 1
      );
      const existing = await prisma.shift.findMany({
        where: { siteId, id: excludeFilter, start: { gte: monthStart, lte: monthEnd } },
        select: { start: true, end: true },
      });
      budgetWarning = {
        tipo: "PASS_MENSILE",
        pianificate: existing.reduce((s, sh) => s + hoursBetween(sh.start, sh.end), newPersonHours),
        contrattuali: acceptedQuoteSite.ore * (acceptedQuoteSite.passMensile ?? 0),
      };
    } else if (acceptedQuoteSite.serviceType === "ONE_SHOT") {
      const existing = await prisma.shift.findMany({
        where: { siteId, id: excludeFilter },
        select: { start: true, end: true },
      });
      budgetWarning = {
        tipo: "ONE_SHOT",
        pianificate: existing.reduce((s, sh) => s + hoursBetween(sh.start, sh.end), newPersonHours),
        contrattuali: acceptedQuoteSite.ore * acceptedQuoteSite.oneShotCount,
      };
    }
  }

  const distanceInfos: ShiftConflicts["distanceInfos"] = [];
  if (site?.lat != null && site?.lng != null) {
    for (const userId of userIds) {
      const other = sameDayOtherSiteShifts.find(
        (s) => s.userId === userId && s.site.lat != null && s.site.lng != null
      );
      if (other) {
        distanceInfos.push({
          userId,
          employeeName: other.user.name,
          km: haversineKm(
            { lat: site.lat, lng: site.lng },
            { lat: other.site.lat!, lng: other.site.lng! }
          ),
          altraSedeLabel: `${clientDisplayName(other.site.client)} — ${other.site.name}`,
        });
      }
    }
  }

  return { overlaps, capacityWarning, budgetWarning, distanceInfos };
}
