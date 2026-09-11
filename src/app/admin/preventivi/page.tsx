import Link from "next/link";
import { requireModule } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { computeListPrice, computeSoldAnnual, computeDiscountPct } from "@/lib/quotes";
import { getServiceTypeLabels, getServiceTypeAbbreviazioni } from "@/lib/serviceTypeLabels";
import { formatSedeAddress } from "@/lib/quotePrint";
import { clientDisplayName } from "@/lib/clients";
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

  const [
    clientsRaw,
    quotes,
    phrases,
    editingQuoteRaw,
    serviceLabels,
    serviceAbbreviazioni,
    tipiPrestazioneRows,
    attachments,
  ] = await Promise.all([
      prisma.client.findMany({
        include: { sites: true },
      }),
      prisma.quote.findMany({
        include: { client: true, sites: { include: { site: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.quotePhrase.findMany({
        orderBy: { codice: "asc" },
      }),
      edit
        ? prisma.quote.findUnique({
            where: { id: edit },
            include: { sites: true, attachments: { orderBy: { ordine: "asc" } } },
          })
        : null,
      getServiceTypeLabels(),
      getServiceTypeAbbreviazioni(),
      prisma.tipoPrestazione.findMany({
        orderBy: [{ ordine: "asc" }, { etichetta: "asc" }],
      }),
      prisma.attachment.findMany({ orderBy: { createdAt: "asc" } }),
    ]);

  // Per i Privati la denominazione mostrata (e l'ordinamento) è sempre
  // "Cognome Nome", coerente con l'elenco Clienti — indipendentemente da come
  // è stato salvato in origine il campo name.
  const clients = clientsRaw
    .map((c) => ({
      id: c.id,
      name: clientDisplayName(c),
      baseAddress:
        [c.indirizzo, c.cap, c.citta, c.provincia].filter(Boolean).join(", ") || null,
      sites: c.sites.map((s) => ({ id: s.id, name: s.name, address: s.address })),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "it"));

  const editingQuote = editingQuoteRaw
    ? {
        id: editingQuoteRaw.id,
        clientId: editingQuoteRaw.clientId,
        condizioniPagamento: editingQuoteRaw.condizioniPagamento,
        attachmentIds: editingQuoteRaw.attachments.map((a) => a.attachmentId),
        sites: editingQuoteRaw.sites.map((s) => ({
          siteId: s.siteId,
          tipoPrestazione: s.tipoPrestazione,
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
          note: s.note,
        })),
      }
    : undefined;

  const tipiPrestazione = tipiPrestazioneRows.map((t) => t.etichetta);
  // Nell'elenco preventivi si mostra l'Abbreviazione al posto del testo
  // completo, per non appesantire la colonna; se non impostata (o se il
  // testo non corrisponde più a nessuna voce) si mostra il testo per intero.
  const abbreviazioniPerEtichetta = new Map(
    tipiPrestazioneRows.map((t) => [t.etichetta, t.abbreviazione])
  );

  const rows = quotes.map((q) => {
    const siteRows = q.sites.map((qs) => {
      const listPrice = computeListPrice(qs);
      // Netto: il prezzo salvato (Totale - Sconto), o il listino se non c'è
      // sconto. Vendita: l'Adeguamento se presente, altrimenti il Netto.
      const netto = qs.prezzoVenduto ?? listPrice;
      const vendita = qs.adeguamento ?? netto;
      // Una tantum non è un canone che si ripete ogni mese: va escluso dal
      // monitoraggio mensile ("Contratti accettati / mese"), pur restando
      // conteggiato nella Vendita complessiva del documento.
      const venditaRicorrente = qs.serviceType === "ONE_SHOT" ? 0 : vendita;
      const annuo =
        q.status === "ACCETTATO" ? computeSoldAnnual(qs.serviceType, vendita) : 0;
      return { ...qs, listPrice, netto, vendita, venditaRicorrente, annuo };
    });

    const listPrice = siteRows.reduce((sum, s) => sum + s.listPrice, 0);
    const netto = siteRows.reduce((sum, s) => sum + s.netto, 0);
    const vendita = siteRows.reduce((sum, s) => sum + s.vendita, 0);
    const venditaRicorrente = siteRows.reduce((sum, s) => sum + s.venditaRicorrente, 0);
    // Lo sconto riflette listino → netto complessivo (prima dell'adeguamento
    // manuale).
    const discountPct = computeDiscountPct(listPrice, netto);
    const annuo = siteRows.reduce((sum, s) => sum + s.annuo, 0);
    const siteCount = q.sites.length;
    // Dettaglio per sede: usato dal pannello "a grappolo" per mostrare gli
    // importi (e ora anche il Tipo servizio) di ciascuna sede — possono
    // differire da un cantiere all'altro anche nello stesso preventivo.
    const perSite = siteRows.map((s, i) => {
      // Cadenza compatta: solo l'Abbreviazione della frequenza (o
      // l'etichetta per intero, se non impostata) e il numero inserito —
      // es. "PS 1" — per distinguere a colpo d'occhio le sedi con
      // frequenze diverse senza appesantire la colonna.
      const freqLabel = serviceAbbreviazioni[s.serviceType] || serviceLabels[s.serviceType];
      const n =
        s.serviceType === "ONE_SHOT"
          ? s.oneShotCount
          : s.serviceType === "PASS_SETTIMANALE"
            ? (s.passSettimanale ?? 0)
            : (s.passMensile ?? 0);
      return {
        siteAddress: formatSedeAddress(q.sites[i].site.address),
        tipoServizio: abbreviazioniPerEtichetta.get(s.tipoPrestazione) || s.tipoPrestazione,
        cadenza: `${freqLabel} ${n}`,
        listPrice: s.listPrice,
        discountPct: computeDiscountPct(s.listPrice, s.netto),
        netto: s.netto,
        vendita: s.vendita,
      };
    });
    const tipoServizio = perSite.every((s) => s.tipoServizio === perSite[0].tipoServizio)
      ? perSite[0].tipoServizio
      : null;
    const cadenza = perSite.every((s) => s.cadenza === perSite[0].cadenza)
      ? perSite[0].cadenza
      : null;

    return {
      id: q.id,
      numeroOfferta: q.numeroOfferta,
      status: q.status,
      clientName: clientDisplayName(q.client),
      tipoServizio,
      siteCount,
      perSite,
      cadenza,
      listPrice,
      netto,
      vendita,
      venditaRicorrente,
      discountPct,
      annuo,
    };
  });

  const inTrattativaValore = rows
    .filter((r) => r.status === "IN_TRATTATIVA")
    .reduce((sum, r) => sum + r.listPrice, 0);
  const mensileAccettato = rows
    .filter((r) => r.status === "ACCETTATO")
    .reduce((sum, r) => sum + r.venditaRicorrente, 0);
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
              attachments={attachments.map((a) => ({ id: a.id, nome: a.nome }))}
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
            clientName: r.clientName,
            siteCount: r.siteCount,
            perSite: r.perSite,
            tipoServizio: r.tipoServizio,
            cadenza: r.cadenza,
            listPrice: r.listPrice,
            netto: r.netto,
            vendita: r.vendita,
            discountPct: r.discountPct,
            status: r.status,
          }))}
        />
    </div>
  );
}
