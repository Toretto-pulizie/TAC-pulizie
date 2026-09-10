import Link from "next/link";
import { requireModule } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { computeListPrice, computeSoldAnnual, computeDiscountPct } from "@/lib/quotes";
import { getServiceTypeLabels } from "@/lib/serviceTypeLabels";
import { labelWithFrequency } from "@/lib/quotePrint";
import { QuoteForm } from "./QuoteForm";
import { CollapsibleForm } from "@/app/CollapsibleForm";
import { QuoteList } from "./QuoteList";

function formatEuro(n: number) {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

export default async function PreventiviPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  await requireModule("preventivi");
  const { edit } = await searchParams;

  const [clientsRaw, quotes, phrases, editingQuoteRaw, serviceLabels, tipiPrestazioneRows] =
    await Promise.all([
      prisma.client.findMany({
        include: { sites: true },
        orderBy: { name: "asc" },
      }),
      prisma.quote.findMany({
        include: { client: true, sites: { include: { site: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.quotePhrase.findMany({
        orderBy: { codice: "asc" },
      }),
      edit
        ? prisma.quote.findUnique({ where: { id: edit }, include: { sites: true } })
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
        clientId: editingQuoteRaw.clientId,
        tipoPrestazione: editingQuoteRaw.tipoPrestazione,
        condizioniPagamento: editingQuoteRaw.condizioniPagamento,
        note: editingQuoteRaw.note,
        sites: editingQuoteRaw.sites.map((s) => ({
          siteId: s.siteId,
          serviceType: s.serviceType,
          ore: s.ore,
          spostamento: s.spostamento,
          oneShotCount: s.oneShotCount,
          passSettimanale: s.passSettimanale,
          passMensile: s.passMensile,
          oreVetri: s.oreVetri,
          passVetriAnno: s.passVetriAnno,
          tariffaOraria: s.tariffaOraria,
          tariffaVetri: s.tariffaVetri,
          tariffaConsuntivo: s.tariffaConsuntivo,
          scontoPct: s.scontoPct,
          prezzoVenduto: s.prezzoVenduto,
          adeguamento: s.adeguamento,
        })),
      }
    : undefined;

  const tipiPrestazione = tipiPrestazioneRows.map((t) => t.etichetta);

  const rows = quotes.map((q) => {
    const siteRows = q.sites.map((qs) => {
      const listPrice = computeListPrice(qs);
      // L'adeguamento, se presente, sostituisce il Netto come prezzo finale.
      const prezzoFinale = qs.adeguamento ?? qs.prezzoVenduto;
      const annuo =
        q.status === "ACCETTATO" && prezzoFinale != null
          ? computeSoldAnnual(qs.serviceType, prezzoFinale)
          : 0;
      return { ...qs, listPrice, prezzoFinale, annuo };
    });

    const listPrice = siteRows.reduce((sum, s) => sum + s.listPrice, 0);
    // Lo sconto riflette listino → netto complessivo (prima dell'adeguamento
    // manuale), calcolato solo sulle sedi che hanno un Netto: le sedi senza
    // Netto (prezzate solo con Adeguamento) non vanno lette come "sconto 100%".
    const siteRowsConNetto = siteRows.filter((s) => s.prezzoVenduto != null);
    const discountPct =
      siteRowsConNetto.length > 0
        ? computeDiscountPct(
            siteRowsConNetto.reduce((sum, s) => sum + s.listPrice, 0),
            siteRowsConNetto.reduce((sum, s) => sum + (s.prezzoVenduto ?? 0), 0)
          )
        : null;
    const hasPrezzoFinale = siteRows.some((s) => s.prezzoFinale != null);
    const prezzoFinale = hasPrezzoFinale
      ? siteRows.reduce((sum, s) => sum + (s.prezzoFinale ?? 0), 0)
      : null;
    const annuo = siteRows.reduce((sum, s) => sum + s.annuo, 0);
    const siteLabel = q.sites.map((s) => s.site.name).join(", ");
    const serviceLabel = siteRows
      .map((s) =>
        labelWithFrequency(
          s.serviceType,
          serviceLabels[s.serviceType],
          s.passSettimanale,
          s.passMensile
        )
      )
      .join(", ");

    return {
      id: q.id,
      numeroOfferta: q.numeroOfferta,
      status: q.status,
      clientName: q.client.name,
      siteLabel,
      serviceLabel,
      listPrice,
      prezzoFinale,
      discountPct,
      annuo,
    };
  });

  const inTrattativaValore = rows
    .filter((r) => r.status === "IN_TRATTATIVA")
    .reduce((sum, r) => sum + r.listPrice, 0);
  const mensileAccettato = rows
    .filter((r) => r.status === "ACCETTATO")
    .reduce((sum, r) => sum + (r.prezzoFinale ?? 0), 0);
  const annuoAccettato = rows.reduce((sum, r) => sum + r.annuo, 0);

  return (
    <div className="flex flex-col gap-6 px-4 py-4 sm:px-8 sm:py-8">
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

        <div className="flex flex-wrap items-center gap-3">
          <CollapsibleForm
            key={editingQuote?.id ?? "new"}
            label="Nuovo preventivo"
            defaultOpen={!!editingQuote}
          >
            <QuoteForm
              clients={clients}
              phrases={phrases.map((p) => ({
                id: p.id,
                codice: p.codice,
                titolo: p.titolo,
                testo: p.testo,
              }))}
              serviceLabels={serviceLabels}
              tipiPrestazione={tipiPrestazione}
              editingQuote={editingQuote}
            />
          </CollapsibleForm>
          <Link
            href="/admin/preventivi/frasi"
            className="text-sm text-zinc-600 underline"
          >
            Gestisci frasi preimpostate →
          </Link>
        </div>

        <QuoteList
          rows={rows.map((r) => ({
            id: r.id,
            numeroOfferta: r.numeroOfferta,
            siteLabel: `${r.clientName} — ${r.siteLabel}`,
            serviceLabel: r.serviceLabel,
            listPrice: r.listPrice,
            prezzoVenduto: r.prezzoFinale,
            discountPct: r.discountPct,
            status: r.status,
          }))}
        />
    </div>
  );
}
