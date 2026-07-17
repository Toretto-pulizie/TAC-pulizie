import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { computeListPrice, computeSoldAnnual, computeDiscountPct } from "@/lib/quotes";
import { getServiceTypeLabels } from "@/lib/serviceTypeLabels";
import { labelWithFrequency } from "@/lib/quotePrint";
import { AdminNav } from "../AdminNav";
import { QuoteForm } from "./QuoteForm";
import { QuoteRow } from "./QuoteRow";

function formatEuro(n: number) {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

export default async function PreventiviPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  await requireAdmin();
  const { edit } = await searchParams;

  const [clientsRaw, quotes, phrases, editingQuoteRaw, serviceLabels, tipiPrestazioneRows] =
    await Promise.all([
      prisma.client.findMany({
        include: { sites: true },
        orderBy: { name: "asc" },
      }),
      prisma.quote.findMany({
        include: { site: { include: { client: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.quotePhrase.findMany({
        orderBy: { codice: "asc" },
      }),
      edit
        ? prisma.quote.findUnique({ where: { id: edit }, include: { site: true } })
        : null,
      getServiceTypeLabels(),
      prisma.tipoPrestazione.findMany({
        orderBy: [{ ordine: "asc" }, { etichetta: "asc" }],
      }),
    ]);

  const clients = clientsRaw.map((c) => ({
    id: c.id,
    name: c.name,
    baseAddress:
      [c.indirizzo, c.cap, c.citta, c.provincia].filter(Boolean).join(", ") || null,
    sites: c.sites.map((s) => ({ id: s.id, name: s.name, address: s.address })),
  }));

  const editingQuote = editingQuoteRaw
    ? {
        id: editingQuoteRaw.id,
        clientId: editingQuoteRaw.site.clientId,
        siteId: editingQuoteRaw.siteId,
        serviceType: editingQuoteRaw.serviceType,
        ore: editingQuoteRaw.ore,
        spostamento: editingQuoteRaw.spostamento,
        oneShotCount: editingQuoteRaw.oneShotCount,
        passSettimanale: editingQuoteRaw.passSettimanale,
        passMensile: editingQuoteRaw.passMensile,
        oreVetri: editingQuoteRaw.oreVetri,
        passVetriAnno: editingQuoteRaw.passVetriAnno,
        tariffaOraria: editingQuoteRaw.tariffaOraria,
        tariffaVetri: editingQuoteRaw.tariffaVetri,
        tariffaConsuntivo: editingQuoteRaw.tariffaConsuntivo,
        prezzoVenduto: editingQuoteRaw.prezzoVenduto,
        condizioniPagamento: editingQuoteRaw.condizioniPagamento,
        tipoPrestazione: editingQuoteRaw.tipoPrestazione,
        note: editingQuoteRaw.note,
      }
    : undefined;

  const tipiPrestazione = tipiPrestazioneRows.map((t) => t.etichetta);

  const rows = quotes.map((q) => {
    const listPrice = computeListPrice(q);
    const discountPct =
      q.prezzoVenduto != null ? computeDiscountPct(listPrice, q.prezzoVenduto) : null;
    const annuo =
      q.status === "ACCETTATO" && q.prezzoVenduto != null
        ? computeSoldAnnual(q.serviceType, q.prezzoVenduto)
        : 0;
    return { ...q, listPrice, discountPct, annuo };
  });

  const inTrattativaValore = rows
    .filter((r) => r.status === "IN_TRATTATIVA")
    .reduce((sum, r) => sum + r.listPrice, 0);
  const mensileAccettato = rows
    .filter((r) => r.status === "ACCETTATO")
    .reduce((sum, r) => sum + (r.prezzoVenduto ?? 0), 0);
  const annuoAccettato = rows.reduce((sum, r) => sum + r.annuo, 0);

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="preventivi" />
      <div className="flex flex-col gap-6 p-4 sm:p-8">
        <div className="flex justify-end">
          <Link
            href="/admin/preventivi/frasi"
            className="text-sm text-zinc-600 underline"
          >
            Gestisci frasi preimpostate →
          </Link>
        </div>

        <div id="quote-form">
          <QuoteForm
            key={editingQuote?.id ?? "new"}
            clients={clients}
            phrases={phrases.map((p) => ({
              id: p.id,
              codice: p.codice,
              categoria: p.categoria,
              titolo: p.titolo,
              testo: p.testo,
            }))}
            serviceLabels={serviceLabels}
            tipiPrestazione={tipiPrestazione}
            editingQuote={editingQuote}
          />
        </div>

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Preventivi in trattativa</p>
            <p className="text-xl font-semibold text-zinc-900">
              {formatEuro(inTrattativaValore)}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Contratti accettati / mese</p>
            <p className="text-xl font-semibold text-zinc-900">
              {formatEuro(mensileAccettato)}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Valore annuo contratti</p>
            <p className="text-xl font-semibold text-zinc-900">
              {formatEuro(annuoAccettato)}
            </p>
          </div>
        </section>

        <section className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Cliente / cantiere</th>
                <th className="px-4 py-3 font-medium">Servizio</th>
                <th className="px-4 py-3 font-medium">Prezzo listino</th>
                <th className="px-4 py-3 font-medium">Prezzo venduto</th>
                <th className="px-4 py-3 font-medium">Sconto</th>
                <th className="px-4 py-3 font-medium">Stato</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <QuoteRow
                  key={r.id}
                  id={r.id}
                  siteLabel={`${r.site.client.name} — ${r.site.name}`}
                  serviceLabel={labelWithFrequency(
                    r.serviceType,
                    serviceLabels[r.serviceType],
                    r.passSettimanale,
                    r.passMensile
                  )}
                  listPrice={r.listPrice}
                  prezzoVenduto={r.prezzoVenduto}
                  discountPct={r.discountPct}
                  status={r.status}
                  note={r.note}
                />
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-zinc-400">
                    Nessun preventivo ancora creato.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
