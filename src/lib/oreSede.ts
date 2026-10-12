// Ripartizione delle ore lavorate su una sede tra le sue righe d'offerta.
//
// Una sede può avere più righe nello stesso mese (due canoni, oppure una
// tantum + canone continuativo): le ore timbrate sulla sede vanno divise tra
// le righe, non contate per intero su ciascuna.
// - L'una tantum è attiva solo nel suo mese di esecuzione (vedi
//   competenzaUnaTantum); il canone è sempre attivo.
// - Nel mese con entrambe, le prime ore vanno all'una tantum fino alle ore
//   previste dall'offerta (ore × interventi); il resto si divide in parti
//   uguali tra i canoni.
// - Se non c'è nessuna riga attiva (es. una tantum eseguita in un mese
//   diverso da quello indicato) si usano comunque tutte le righe.

export type LineaOre = {
  id: string;
  serviceType: "ONE_SHOT" | "PASS_SETTIMANALE" | "PASS_MENSILE" | "PASS_ANNUALE";
  ore: number;
  oneShotCount: number;
  // "AAAA-MM": mese di competenza, solo per le una tantum.
  competenza: string | null;
};

export type QuotaOre = { workMinutes: number; travelMinutes: number };

// Mese di esecuzione di una riga una tantum: quello indicato, altrimenti il
// mese in cui l'offerta è stata accettata (o creata, se manca la data).
export function competenzaUnaTantum(
  qs: { meseUnaTantum: string | null },
  quote: { closedAt: Date | null; createdAt: Date }
): string {
  if (qs.meseUnaTantum) return qs.meseUnaTantum;
  const d = quote.closedAt ?? quote.createdAt;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function meseKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function ripartisciOre(
  lines: LineaOre[],
  tot: QuotaOre,
  mese: string
): Map<string, QuotaOre> {
  const out = new Map<string, QuotaOre>();
  if (lines.length === 0) return out;

  let active = lines.filter((l) => l.serviceType !== "ONE_SHOT" || l.competenza === mese);
  if (active.length === 0) active = lines;
  const ones = active.filter((l) => l.serviceType === "ONE_SHOT");
  const recs = active.filter((l) => l.serviceType !== "ONE_SHOT");

  const work = new Map<string, number>();
  let remaining = tot.workMinutes;
  if (recs.length === 0) {
    // Solo una tantum: le ore si dividono in parti uguali.
    for (const l of ones) work.set(l.id, tot.workMinutes / ones.length);
    remaining = 0;
  } else {
    const planned = ones.map((l) => ({ l, m: Math.max(0, l.ore * l.oneShotCount * 60) }));
    const sumPlanned = planned.reduce((s, p) => s + p.m, 0);
    const scale = sumPlanned > 0 ? Math.min(1, tot.workMinutes / sumPlanned) : 0;
    for (const p of planned) {
      const give = p.m * scale;
      work.set(p.l.id, give);
      remaining -= give;
    }
    for (const l of recs) work.set(l.id, Math.max(0, remaining) / recs.length);
  }

  const allocated = [...work.values()].reduce((s, v) => s + v, 0);
  for (const l of active) {
    const w = work.get(l.id) ?? 0;
    // Lo spostamento segue la stessa ripartizione del lavoro.
    const share = allocated > 0 ? w / allocated : 1 / active.length;
    out.set(l.id, { workMinutes: w, travelMinutes: tot.travelMinutes * share });
  }
  return out;
}

// Ripartisce le ore di tutte le sedi su tutte le loro righe: restituisce, per
// ogni riga d'offerta, le sue ore del mese (solo le righe attive nel mese).
export function oreRipartitePerRiga(
  quoteSites: {
    id: string;
    siteId: string;
    serviceType: "ONE_SHOT" | "PASS_SETTIMANALE" | "PASS_MENSILE" | "PASS_ANNUALE";
    ore: number;
    oneShotCount: number;
    meseUnaTantum: string | null;
    quote: { closedAt: Date | null; createdAt: Date };
  }[],
  siteTotals: Map<string, QuotaOre>,
  mese: string
): Map<string, QuotaOre> {
  const bySite = new Map<string, typeof quoteSites>();
  for (const q of quoteSites) {
    const list = bySite.get(q.siteId) ?? [];
    list.push(q);
    bySite.set(q.siteId, list);
  }
  const out = new Map<string, QuotaOre>();
  for (const [siteId, tot] of siteTotals) {
    const lines = bySite.get(siteId);
    if (!lines) continue;
    const alloc = ripartisciOre(
      lines.map(
        (q): LineaOre => ({
          id: q.id,
          serviceType: q.serviceType,
          ore: q.ore,
          oneShotCount: q.oneShotCount,
          competenza: q.serviceType === "ONE_SHOT" ? competenzaUnaTantum(q, q.quote) : null,
        })
      ),
      tot,
      mese
    );
    for (const [id, v] of alloc) out.set(id, v);
  }
  return out;
}
