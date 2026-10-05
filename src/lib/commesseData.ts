import { prisma } from "@/lib/prisma";
import { clientDisplayName } from "@/lib/clients";
import { computeCommesse } from "@/lib/commesse";

// Carica i dati e calcola le righe delle Commesse (una per cliente) per un
// periodo; senza periodo = dall'inizio a oggi. Condiviso da Commesse e dalla
// sezione "Da fatturare" di Fatturazione, così i numeri sono sempre gli stessi.
export async function loadCommesse(range: { start: Date; end: Date } | null) {
  const [clients, quotes, entries, invoices] = await Promise.all([
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
        tipoDocumento: true,
        stato: true,
        anno: true,
        numero: true,
        data: true,
        righe: { select: { importo: true } },
      },
    }),
  ]);

  return computeCommesse({
    clients: clients.map((c) => ({ id: c.id, name: clientDisplayName(c) })),
    quotes,
    entries,
    invoices: invoices.map((i) => ({
      clientId: i.clientId,
      tipoDocumento: i.tipoDocumento,
      stato: i.stato,
      anno: i.anno,
      numero: i.numero,
      data: i.data,
      importo: i.righe.reduce((s, r) => s + r.importo, 0),
    })),
  });
}
