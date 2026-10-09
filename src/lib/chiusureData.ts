import { prisma } from "@/lib/prisma";
import {
  canoneDelMese,
  type ChiusuraScelta,
  type ClosureRange,
} from "@/lib/chiusure";

// Dati comuni per i calcoli legati alla chiusura aziendale: periodi, giorni
// di passaggio dalla Pianificazione (per sede d'offerta) e sedi con accesso.
export type ChiusureContext = {
  closures: ClosureRange[];
  weekdaysByQuoteSite: Map<string, number[]>;
};

export async function loadChiusureContext(): Promise<ChiusureContext> {
  const [periods, plans] = await Promise.all([
    prisma.closurePeriod.findMany({ orderBy: { dal: "asc" } }),
    prisma.shiftPlan.findMany({
      where: { quoteSiteId: { not: null } },
      select: { quoteSiteId: true, daysOfWeek: true },
    }),
  ]);
  const weekdaysByQuoteSite = new Map<string, number[]>();
  for (const p of plans) {
    if (!p.quoteSiteId) continue;
    const set = new Set(weekdaysByQuoteSite.get(p.quoteSiteId) ?? []);
    p.daysOfWeek.forEach((d) => set.add(d));
    weekdaysByQuoteSite.set(p.quoteSiteId, [...set]);
  }
  return {
    closures: periods.map((p) => ({ dal: p.dal, al: p.al })),
    weekdaysByQuoteSite,
  };
}

// Importo di una sede d'offerta in un mese: scorciatoia per i chiamanti che
// hanno già il contesto, la sede e l'offerta.
export function importoMeseSede(
  ctx: ChiusureContext,
  base: number,
  qs: { id: string; serviceType: "ONE_SHOT" | "PASS_SETTIMANALE" | "PASS_MENSILE" },
  quote: { chiusuraScelta: ChiusuraScelta },
  accessoSenzaCliente: boolean,
  year: number,
  month: number
): number {
  return canoneDelMese(base, qs.serviceType, {
    year,
    month,
    closures: ctx.closures,
    scelta: quote.chiusuraScelta,
    accessoSenzaCliente,
    weekdays: ctx.weekdaysByQuoteSite.get(qs.id) ?? null,
  });
}
