import Link from "next/link";
import { notFound } from "next/navigation";
import { requireModule } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { clientDisplayName } from "@/lib/clients";
import { getServiceTypeLabels, getServiceTypeMostraCadenza } from "@/lib/serviceTypeLabels";
import { toDateInputValue } from "@/lib/dates";
import { loadChiusureContext } from "@/lib/chiusureData";
import { InvoiceForm } from "../InvoiceForm";
import { buildSiteOptions } from "../buildSiteOptions";
import { EmettiButton } from "./EmettiButton";
import { CreditNoteButton } from "./CreditNoteButton";
import { SentButton } from "./SentButton";

const STATO_LABELS: Record<string, string> = {
  BOZZA: "Bozza",
  EMESSA: "Emessa",
  INVIATA: "Inviata",
  SCARTATA: "Scartata",
  CONSEGNATA: "Consegnata",
  ACCETTATA: "Accettata",
  RIFIUTATA: "Rifiutata",
  ERRORE_INVIO: "Errore invio",
};

export default async function FatturaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireModule("fatturazione");
  const { id } = await params;

  const [invoice, clientsRaw, quotesRaw, serviceLabels, mostraCadenzaSettings] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: {
        righe: { orderBy: { ordine: "asc" } },
        rettificaDi: true,
        noteDiCredito: { include: { righe: true }, orderBy: { createdAt: "asc" } },
        eventi: { orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.client.findMany(),
    prisma.quote.findMany({
      where: { status: "ACCETTATO" },
      include: { sites: { where: { confermata: true }, include: { site: true } } },
      orderBy: { numeroOfferta: "desc" },
    }),
    getServiceTypeLabels(),
    getServiceTypeMostraCadenza(),
  ]);

  if (!invoice) notFound();

  const clients = clientsRaw
    .map((c) => ({ id: c.id, name: clientDisplayName(c), tipo: c.tipo }))
    .sort((a, b) => a.name.localeCompare(b.name, "it"));

  const chiusure = await loadChiusureContext();
  // Righe d'offerta già fatturate (fatture normali, non note di credito).
  const righeFatturate = await prisma.invoiceLine.findMany({
    where: {
      quoteSiteId: { not: null },
      invoice: { tipoDocumento: "TD01", id: { not: id } },
    },
    select: { quoteSiteId: true, invoice: { select: { numero: true, anno: true, data: true } } },
  });
  const fatturate = new Map<string, { numero: string; mese: string }[]>();
  for (const r of righeFatturate) {
    if (!r.quoteSiteId) continue;
    const list = fatturate.get(r.quoteSiteId) ?? [];
    list.push({
      numero: r.invoice.numero != null ? `${r.invoice.numero}/${r.invoice.anno}` : "in bozza",
      mese: toDateInputValue(r.invoice.data).slice(0, 7),
    });
    fatturate.set(r.quoteSiteId, list);
  }
  const sites = buildSiteOptions(quotesRaw, serviceLabels, mostraCadenzaSettings, chiusure, fatturate);
  const closures = chiusure.closures.map((c) => ({
    dal: toDateInputValue(new Date(c.dal)),
    al: toDateInputValue(new Date(c.al)),
  }));

  const isCreditNote = invoice.tipoDocumento === "TD04";
  const docName = isCreditNote ? "Nota di credito" : "Fattura";
  const numeroLabel = invoice.numero != null ? `${invoice.numero}/${invoice.anno}` : "Bozza";
  const refLabel = (n: { numero: number | null; anno: number | null }) =>
    n.numero != null ? `${n.numero}/${n.anno}` : "bozza";
  const eur = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
  const totaleStornato = invoice.noteDiCredito
    .filter((n) => n.stato !== "BOZZA")
    .reduce((sum, n) => sum + n.righe.reduce((s, r) => s + r.importo, 0), 0);

  return (
    <div className="flex flex-col gap-6 px-4 py-4 sm:px-8 sm:py-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link prefetch={false} href="/admin/fatturazione" className="text-sm text-zinc-500">
            ← Fatturazione
          </Link>
          <h1 className="text-lg font-semibold text-zinc-900">
            {docName} {numeroLabel} — {STATO_LABELS[invoice.stato]}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/admin/fatturazione/${id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
          >
            Vedi PDF
          </a>
          {invoice.stato === "BOZZA" && <EmettiButton id={id} />}
          {invoice.stato === "EMESSA" && <SentButton id={id} sent={false} />}
          {invoice.stato === "INVIATA" && !invoice.arubaUploadFileName && <SentButton id={id} sent />}
          {invoice.stato !== "BOZZA" && !isCreditNote && <CreditNoteButton id={id} />}
        </div>
      </div>

      {invoice.rettificaDi && (
        <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">
          Storna la{" "}
          <Link prefetch={false} href={`/admin/fatturazione/${invoice.rettificaDi.id}`} className="font-semibold underline">
            fattura {refLabel(invoice.rettificaDi)}
          </Link>{" "}
          del {invoice.rettificaDi.data.toLocaleDateString("it-IT")}.
        </p>
      )}
      {invoice.noteDiCredito.length > 0 && (
        <p className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-700">
          Note di credito collegate:{" "}
          {invoice.noteDiCredito.map((n, i) => (
            <span key={n.id}>
              {i > 0 && ", "}
              <Link prefetch={false} href={`/admin/fatturazione/${n.id}`} className="font-semibold underline">
                {refLabel(n)}
              </Link>
            </span>
          ))}
          {totaleStornato > 0 && <> — già stornati {eur(totaleStornato)} (imponibile).</>}
        </p>
      )}

      {invoice.stato === "BOZZA" ? (
        <InvoiceForm
          isCreditNote={isCreditNote}
          clients={clients}
          sites={sites}
        closures={closures}
          defaultData={invoice.data.toISOString().slice(0, 10)}
          editing={{
            id: invoice.id,
            clientId: invoice.clientId,
            quoteId: invoice.quoteId,
            data: invoice.data.toISOString().slice(0, 10),
            condizioniPagamento: invoice.condizioniPagamento,
            regimeIva: invoice.regimeIva,
            note: invoice.note,
            righe: invoice.righe.map((r) => ({
              descrizione: r.descrizione,
              quantita: r.quantita,
              prezzoUnitario: r.prezzoUnitario,
              sourceId: r.quoteSiteId ?? undefined,
            })),
          }}
        />
      ) : (
        <section className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-zinc-500">
            {docName} emessa: non più modificabile. Righe:
          </p>
          <ul className="flex flex-col gap-1 text-sm">
            {invoice.righe.map((r) => (
              <li key={r.id} className="flex justify-between border-b border-zinc-100 py-1">
                <span>{r.descrizione}</span>
                <span className="text-zinc-500">
                  {r.quantita} × {r.prezzoUnitario.toLocaleString("it-IT", { style: "currency", currency: "EUR" })} ={" "}
                  {r.importo.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {invoice.eventi.length > 0 && (
        <section className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-900">Storico</h2>
          <ul className="flex flex-col gap-1 text-sm text-zinc-600">
            {invoice.eventi.map((e) => (
              <li key={e.id} className="flex justify-between gap-3 border-b border-zinc-100 py-1 last:border-0">
                <span>{e.dettaglio ?? e.tipo}</span>
                <span className="shrink-0 text-zinc-400">
                  {e.createdAt.toLocaleDateString("it-IT")}{" "}
                  {e.createdAt.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
