import type { EntryType, Quote, QuoteSite } from "@prisma/client";
import { computeListPrice, computeSoldAnnual } from "@/lib/quotes";
import { importoMeseSede, type ChiusureContext } from "@/lib/chiusureData";
import { competenzaUnaTantum, meseKey, ripartisciOre, type LineaOre } from "@/lib/oreSede";
import { computeSiteTotals } from "@/lib/timeCalc";

type QuoteIn = Quote & { sites: QuoteSite[] };

type EntryIn = {
  userId: string;
  siteId: string | null;
  type: EntryType;
  timestamp: Date;
  sessionId: string | null;
};

type InvoiceIn = {
  clientId: string;
  tipoDocumento: string;
  stato: string;
  anno: number | null;
  numero: number | null;
  data: Date;
  importo: number;
};

export type CommessaRow = {
  clientId: string;
  clientName: string;
  offerStato: "ACCETTATA" | "IN_TRATTATIVA" | "RIFIUTATA" | null;
  ftStato: "FATTURATA" | "BOZZA" | null;
  numeri: number[];
  cantieri: number;
  // Importi dell'offerta (prezzo venduto: Adeguamento se presente, altrimenti
  // Netto). Sono quelli delle offerte accettate; se il cliente non ne ha,
  // quelli delle offerte in trattativa (amountsFromPending = true).
  mensile: number;
  annuo: number;
  amountsFromPending: boolean;
  oreLavorate: number;
  oreSpostamento: number;
  contratto: number;
  consuntivo: number;
  scostamento: number | null;
  nFatture: number;
  fatturato: number;
  daFatturare: number | null;
};

// Per un'offerta accettata contano solo le sedi confermate dal cliente.
const sediValide = <T extends { sites: QuoteSite[] }>(q: T) =>
  q.sites.filter((qs) => qs.confermata);

const vendita = (qs: QuoteSite) => qs.adeguamento ?? qs.prezzoVenduto ?? computeListPrice(qs);

const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;

// Una riga per cliente che ha almeno un'offerta o una fattura. Contratto e
// consuntivo seguono la stessa regola di Consuntivi: un'offerta accettata
// conta in un mese solo se in quel mese su quel cantiere c'è almeno un'ora
// lavorata (una tantum: una volta sola). Le ore di un cantiere con più
// righe d'offerta si contano una volta sola, con la media delle tariffe a
// consuntivo, per non raddoppiarle.
export function computeCommesse({
  clients,
  quotes,
  entries,
  invoices,
  chiusure,
  accessoBySite,
}: {
  chiusure: ChiusureContext;
  accessoBySite: Map<string, boolean>;
  clients: { id: string; name: string }[];
  quotes: QuoteIn[];
  entries: EntryIn[];
  invoices: InvoiceIn[];
}): CommessaRow[] {
  const acceptedBySite = new Map<string, { clientId: string; qs: QuoteSite; q: QuoteIn }[]>();
  for (const q of quotes) {
    if (q.status !== "ACCETTATO") continue;
    for (const qs of sediValide(q)) {
      const list = acceptedBySite.get(qs.siteId) ?? [];
      list.push({ clientId: q.clientId, qs, q });
      acceptedBySite.set(qs.siteId, list);
    }
  }

  const entriesByMonth = new Map<string, EntryIn[]>();
  for (const e of entries) {
    const key = monthKey(e.timestamp);
    const list = entriesByMonth.get(key) ?? [];
    list.push(e);
    entriesByMonth.set(key, list);
  }

  const agg = new Map<
    string,
    { ore: number; spost: number; contratto: number; consuntivo: number }
  >();
  const oneShotCounted = new Set<string>();
  for (const monthEntries of entriesByMonth.values()) {
    const totals = computeSiteTotals(monthEntries);
    const mese = monthEntries[0].timestamp.getMonth() + 1;
    const anno = monthEntries[0].timestamp.getFullYear();
    for (const [siteId, t] of totals) {
      const accepted = acceptedBySite.get(siteId);
      if (!accepted) continue;
      const clientId = accepted[0].clientId;
      const a = agg.get(clientId) ?? { ore: 0, spost: 0, contratto: 0, consuntivo: 0 };
      // Le ore della sede si ripartiscono tra le sue righe (una tantum solo
      // nel mese di esecuzione) invece di contarle per intero su ciascuna.
      const mk = meseKey(anno, mese);
      const quote = ripartisciOre(
        accepted.map(({ qs, q }): LineaOre => ({
          id: qs.id,
          serviceType: qs.serviceType,
          ore: qs.ore,
          oneShotCount: qs.oneShotCount,
          competenza: qs.serviceType === "ONE_SHOT" ? competenzaUnaTantum(qs, q) : null,
        })),
        t,
        mk
      );
      for (const { qs, q } of accepted) {
        const share = quote.get(qs.id);
        if (!share) continue;
        const ore = share.workMinutes / 60;
        a.ore += ore;
        a.spost += share.travelMinutes / 60;
        a.consuntivo += ore * qs.tariffaConsuntivo;
        if (qs.serviceType === "ONE_SHOT") {
          if (oneShotCounted.has(qs.id)) continue;
          oneShotCounted.add(qs.id);
          a.contratto += vendita(qs);
        } else {
          a.contratto += importoMeseSede(
            chiusure,
            vendita(qs),
            qs,
            q,
            accessoBySite.get(qs.siteId) ?? false,
            anno,
            mese
          );
        }
      }
      agg.set(clientId, a);
    }
  }

  const quotesByClient = new Map<string, QuoteIn[]>();
  for (const q of quotes) {
    const list = quotesByClient.get(q.clientId) ?? [];
    list.push(q);
    quotesByClient.set(q.clientId, list);
  }
  const invoicesByClient = new Map<string, InvoiceIn[]>();
  for (const inv of invoices) {
    const list = invoicesByClient.get(inv.clientId) ?? [];
    list.push(inv);
    invoicesByClient.set(inv.clientId, list);
  }

  const rows: CommessaRow[] = [];
  for (const client of clients) {
    const cQuotes = quotesByClient.get(client.id) ?? [];
    const cInvoices = invoicesByClient.get(client.id) ?? [];
    if (cQuotes.length === 0 && cInvoices.length === 0) continue;

    const accepted = cQuotes.filter((q) => q.status === "ACCETTATO");
    const pending = cQuotes.filter((q) => q.status === "IN_TRATTATIVA");
    const base = accepted.length > 0 ? accepted : pending;
    const offerStato: CommessaRow["offerStato"] =
      accepted.length > 0
        ? "ACCETTATA"
        : pending.length > 0
          ? "IN_TRATTATIVA"
          : cQuotes.length > 0
            ? "RIFIUTATA"
            : null;

    const baseSites = base.flatMap((q) => (q.status === "ACCETTATO" ? sediValide(q) : q.sites));
    const mensile = baseSites
      .filter((qs) => qs.serviceType !== "ONE_SHOT")
      .reduce((s, qs) => s + vendita(qs), 0);
    const annuo = baseSites.reduce((s, qs) => s + computeSoldAnnual(qs.serviceType, vendita(qs)), 0);

    const emitted = cInvoices.filter((i) => i.stato !== "BOZZA");
    const fatture = emitted.filter((i) => i.tipoDocumento === "TD01");
    const fatturato = emitted.reduce(
      (s, i) => s + (i.tipoDocumento === "TD04" ? -1 : 1) * i.importo,
      0
    );
    const a = agg.get(client.id) ?? { ore: 0, spost: 0, contratto: 0, consuntivo: 0 };

    rows.push({
      clientId: client.id,
      clientName: client.name,
      offerStato,
      ftStato: emitted.length > 0 ? "FATTURATA" : cInvoices.length > 0 ? "BOZZA" : null,
      numeri: base.map((q) => q.numeroOfferta).sort((x, y) => y - x),
      cantieri: new Set(baseSites.map((qs) => qs.siteId)).size,
      mensile,
      annuo,
      amountsFromPending: accepted.length === 0 && pending.length > 0,
      oreLavorate: a.ore,
      oreSpostamento: a.spost,
      contratto: a.contratto,
      consuntivo: a.consuntivo,
      scostamento: accepted.length > 0 ? a.contratto - a.consuntivo : null,
      nFatture: fatture.length,
      fatturato,
      daFatturare: accepted.length > 0 ? Math.max(0, a.contratto - fatturato) : null,
    });
  }

  return rows.sort((x, y) => x.clientName.localeCompare(y.clientName, "it"));
}

// ---------------------------------------------------------------------------
// Commesse per offerta: ogni offerta è una commessa, quindi una riga per ogni
// numero d'offerta (82, 83, ...). Ore e consuntivo si attribuiscono alle
// offerte accettate: se più righe d'offerta (anche di offerte diverse) coprono
// lo stesso cantiere, le ore del mese si dividono in parti uguali tra le righe
// (ciascuna col proprio tariffario a consuntivo), così non si raddoppiano. Le
// fatture si collegano all'offerta da cui sono nate; quelle senza offerta
// finiscono in una riga a parte per cliente ("Senza offerta").
// ---------------------------------------------------------------------------

type InvoiceInQ = InvoiceIn & { quoteId: string | null };

export type OffertaRow = {
  key: string;
  quoteId: string | null;
  numero: number | null;
  clientId: string;
  clientName: string;
  offerStato: "ACCETTATA" | "IN_TRATTATIVA" | "RIFIUTATA" | null;
  ftStato: "FATTURATA" | "BOZZA" | null;
  cantieri: number;
  mensile: number;
  annuo: number;
  amountsFromPending: boolean;
  oreLavorate: number;
  oreSpostamento: number;
  contratto: number;
  consuntivo: number;
  scostamento: number | null;
  nFatture: number;
  fatturato: number;
};

export function computeCommessePerOfferta({
  clients,
  quotes,
  entries,
  invoices,
  chiusure,
  accessoBySite,
}: {
  chiusure: ChiusureContext;
  accessoBySite: Map<string, boolean>;
  clients: { id: string; name: string }[];
  quotes: QuoteIn[];
  entries: EntryIn[];
  invoices: InvoiceInQ[];
}): OffertaRow[] {
  const acceptedBySite = new Map<string, { quoteId: string; qs: QuoteSite; q: QuoteIn }[]>();
  for (const q of quotes) {
    if (q.status !== "ACCETTATO") continue;
    for (const qs of sediValide(q)) {
      const list = acceptedBySite.get(qs.siteId) ?? [];
      list.push({ quoteId: q.id, qs, q });
      acceptedBySite.set(qs.siteId, list);
    }
  }

  const entriesByMonth = new Map<string, EntryIn[]>();
  for (const e of entries) {
    const key = monthKey(e.timestamp);
    const list = entriesByMonth.get(key) ?? [];
    list.push(e);
    entriesByMonth.set(key, list);
  }

  const agg = new Map<
    string,
    { ore: number; spost: number; contratto: number; consuntivo: number }
  >();
  const oneShotCounted = new Set<string>();
  for (const monthEntries of entriesByMonth.values()) {
    const totals = computeSiteTotals(monthEntries);
    const mese = monthEntries[0].timestamp.getMonth() + 1;
    const anno = monthEntries[0].timestamp.getFullYear();
    for (const [siteId, t] of totals) {
      const accepted = acceptedBySite.get(siteId);
      if (!accepted) continue;
      const mk = meseKey(anno, mese);
      const quote = ripartisciOre(
        accepted.map(({ qs, q }): LineaOre => ({
          id: qs.id,
          serviceType: qs.serviceType,
          ore: qs.ore,
          oneShotCount: qs.oneShotCount,
          competenza: qs.serviceType === "ONE_SHOT" ? competenzaUnaTantum(qs, q) : null,
        })),
        t,
        mk
      );
      for (const { quoteId, qs, q } of accepted) {
        const share = quote.get(qs.id);
        if (!share) continue;
        const a = agg.get(quoteId) ?? { ore: 0, spost: 0, contratto: 0, consuntivo: 0 };
        const ore = share.workMinutes / 60;
        a.ore += ore;
        a.spost += share.travelMinutes / 60;
        a.consuntivo += ore * qs.tariffaConsuntivo;
        if (qs.serviceType === "ONE_SHOT") {
          if (!oneShotCounted.has(qs.id)) {
            oneShotCounted.add(qs.id);
            a.contratto += vendita(qs);
          }
        } else {
          a.contratto += importoMeseSede(
            chiusure,
            vendita(qs),
            qs,
            q,
            accessoBySite.get(qs.siteId) ?? false,
            anno,
            mese
          );
        }
        agg.set(quoteId, a);
      }
    }
  }

  const clientName = new Map(clients.map((c) => [c.id, c.name]));
  const invoicesByQuote = new Map<string, InvoiceInQ[]>();
  const orphanByClient = new Map<string, InvoiceInQ[]>();
  const quoteIds = new Set(quotes.map((q) => q.id));
  for (const inv of invoices) {
    if (inv.quoteId && quoteIds.has(inv.quoteId)) {
      const list = invoicesByQuote.get(inv.quoteId) ?? [];
      list.push(inv);
      invoicesByQuote.set(inv.quoteId, list);
    } else {
      const list = orphanByClient.get(inv.clientId) ?? [];
      list.push(inv);
      orphanByClient.set(inv.clientId, list);
    }
  }

  const ftSummary = (list: InvoiceInQ[]) => {
    const emitted = list.filter((i) => i.stato !== "BOZZA");
    return {
      ftStato: (emitted.length > 0 ? "FATTURATA" : list.length > 0 ? "BOZZA" : null) as
        | "FATTURATA"
        | "BOZZA"
        | null,
      nFatture: emitted.filter((i) => i.tipoDocumento === "TD01").length,
      fatturato: emitted.reduce(
        (s, i) => s + (i.tipoDocumento === "TD04" ? -1 : 1) * i.importo,
        0
      ),
    };
  };

  const rows: OffertaRow[] = [];
  for (const q of quotes) {
    const isAccepted = q.status === "ACCETTATO";
    const a = agg.get(q.id) ?? { ore: 0, spost: 0, contratto: 0, consuntivo: 0 };
    const sitesQ = isAccepted ? sediValide(q) : q.sites;
    const mensile = sitesQ
      .filter((qs) => qs.serviceType !== "ONE_SHOT")
      .reduce((s, qs) => s + vendita(qs), 0);
    const annuo = sitesQ.reduce((s, qs) => s + computeSoldAnnual(qs.serviceType, vendita(qs)), 0);
    rows.push({
      key: q.id,
      quoteId: q.id,
      numero: q.numeroOfferta,
      clientId: q.clientId,
      clientName: clientName.get(q.clientId) ?? "—",
      offerStato: isAccepted
        ? "ACCETTATA"
        : q.status === "IN_TRATTATIVA"
          ? "IN_TRATTATIVA"
          : "RIFIUTATA",
      cantieri: new Set(sitesQ.map((qs) => qs.siteId)).size,
      mensile,
      annuo,
      amountsFromPending: !isAccepted,
      oreLavorate: a.ore,
      oreSpostamento: a.spost,
      contratto: a.contratto,
      consuntivo: a.consuntivo,
      scostamento: isAccepted ? a.contratto - a.consuntivo : null,
      ...ftSummary(invoicesByQuote.get(q.id) ?? []),
    });
  }
  for (const [clientId, list] of orphanByClient) {
    rows.push({
      key: `senza-offerta-${clientId}`,
      quoteId: null,
      numero: null,
      clientId,
      clientName: clientName.get(clientId) ?? "—",
      offerStato: null,
      cantieri: 0,
      mensile: 0,
      annuo: 0,
      amountsFromPending: false,
      oreLavorate: 0,
      oreSpostamento: 0,
      contratto: 0,
      consuntivo: 0,
      scostamento: null,
      ...ftSummary(list),
    });
  }

  return rows.sort(
    (x, y) => (y.numero ?? -1) - (x.numero ?? -1) || x.clientName.localeCompare(y.clientName, "it")
  );
}
