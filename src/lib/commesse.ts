import type { EntryType, Quote, QuoteSite } from "@prisma/client";
import { computeListPrice, computeSoldAnnual } from "@/lib/quotes";
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
}: {
  clients: { id: string; name: string }[];
  quotes: QuoteIn[];
  entries: EntryIn[];
  invoices: InvoiceIn[];
}): CommessaRow[] {
  const acceptedBySite = new Map<string, { clientId: string; qs: QuoteSite }[]>();
  for (const q of quotes) {
    if (q.status !== "ACCETTATO") continue;
    for (const qs of q.sites) {
      const list = acceptedBySite.get(qs.siteId) ?? [];
      list.push({ clientId: q.clientId, qs });
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
    for (const [siteId, t] of totals) {
      const accepted = acceptedBySite.get(siteId);
      if (!accepted) continue;
      const clientId = accepted[0].clientId;
      const a = agg.get(clientId) ?? { ore: 0, spost: 0, contratto: 0, consuntivo: 0 };
      const ore = t.workMinutes / 60;
      a.ore += ore;
      a.spost += t.travelMinutes / 60;
      for (const { qs } of accepted) {
        if (qs.serviceType === "ONE_SHOT") {
          if (oneShotCounted.has(qs.id)) continue;
          oneShotCounted.add(qs.id);
        }
        a.contratto += vendita(qs);
      }
      const meanTariffa =
        accepted.reduce((s, x) => s + x.qs.tariffaConsuntivo, 0) / accepted.length;
      a.consuntivo += ore * meanTariffa;
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

    const baseSites = base.flatMap((q) => q.sites);
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
