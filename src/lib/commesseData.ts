import { prisma } from "@/lib/prisma";
import { clientDisplayName } from "@/lib/clients";
import { computeCommesse, computeCommessePerOfferta } from "@/lib/commesse";
import { loadChiusureContext } from "@/lib/chiusureData";

async function loadInputs(range: { start: Date; end: Date } | null) {
  const [clients, quotes, entries, invoices, chiusure, sites] = await Promise.all([
    prisma.client.findMany(),
    prisma.quote.findMany({ include: { sites: true } }),
    prisma.timeEntry.findMany({
      where: range ? { timestamp: { gte: range.start, lte: range.end } } : {},
      select: { userId: true, siteId: true, type: true, timestamp: true, sessionId: true },
    }),
    prisma.invoice.findMany({
      where: range ? { data: { gte: range.start, lte: range.end } } : {},
      select: {
        clientId: true,
        quoteId: true,
        tipoDocumento: true,
        stato: true,
        anno: true,
        numero: true,
        data: true,
        righe: { select: { importo: true } },
      },
    }),
    loadChiusureContext(),
    prisma.site.findMany({ select: { id: true, accessoSenzaCliente: true } }),
  ]);

  return {
    chiusure,
    accessoBySite: new Map(sites.map((x) => [x.id, x.accessoSenzaCliente])),
    clients: clients.map((c) => ({ id: c.id, name: clientDisplayName(c) })),
    quotes,
    entries,
    invoices: invoices.map((i) => ({
      clientId: i.clientId,
      quoteId: i.quoteId,
      tipoDocumento: i.tipoDocumento,
      stato: i.stato,
      anno: i.anno,
      numero: i.numero,
      data: i.data,
      importo: i.righe.reduce((s, r) => s + r.importo, 0),
    })),
  };
}

// Una riga per cliente per un periodo; senza periodo = dall'inizio a oggi.
// Usata dalla sezione "Da fatturare" di Fatturazione.
export async function loadCommesse(range: { start: Date; end: Date } | null) {
  return computeCommesse(await loadInputs(range));
}

// Una riga per offerta (ogni offerta è una commessa): usata da Commesse.
export async function loadCommessePerOfferta(range: { start: Date; end: Date } | null) {
  return computeCommessePerOfferta(await loadInputs(range));
}
