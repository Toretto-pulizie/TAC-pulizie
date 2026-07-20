import Image from "next/image";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { computeDiscountPct } from "@/lib/quotes";
import { buildDescriptionLines, buildLineItem, buildNoteParagraphs } from "@/lib/quotePrint";
import { getServiceTypeLabels } from "@/lib/serviceTypeLabels";
import { PrintButton } from "./PrintButton";

function formatEuro(n: number) {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

// TODO: sostituire con i dati bancari reali dell'azienda
const BANCA_APPOGGIO = "[Nome banca] - IBAN: [IBAN]";
const CONDIZIONI_PAGAMENTO_DEFAULT = "A ricevimento fattura";
const ALIQUOTA_IVA = 0.22;
const NOTA_REVERSE_CHARGE =
  'Operazione soggetta al meccanismo dell’inversione contabile ("reverse charge") ai sensi dell’art. 17, comma 6, lett. a-ter), D.P.R. 26 ottobre 1972, n. 633 — IVA assolta dal committente, non addebitata in fattura.';
const NOTA_IVA_PRIVATI =
  "IVA esposta in fattura con applicazione dell'aliquota ordinaria (22%) ai sensi del D.P.R. 26 ottobre 1972, n. 633, non trattandosi di operazione tra soggetti passivi d'imposta.";

function InfoCol({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 border-r border-zinc-300 last:border-r-0">
      <p className="border-b border-zinc-300 bg-zinc-50 px-1.5 py-0.5 text-[8px] uppercase leading-none tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="truncate px-1.5 py-0.5 text-[11px] leading-tight text-zinc-900">
        {value || "—"}
      </p>
    </div>
  );
}

export default async function StampaPreventivoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const [quote, serviceLabels] = await Promise.all([
    prisma.quote.findUnique({
      where: { id },
      include: { site: { include: { client: true } } },
    }),
    getServiceTypeLabels(),
  ]);
  if (!quote) notFound();

  const client = quote.site.client;
  const clientName =
    client.tipo === "PERSONA_FISICA"
      ? `${client.nome ?? ""} ${client.cognome ?? ""}`.trim()
      : client.ragioneSociale ?? client.name;

  const descriptionLines = buildDescriptionLines(quote);
  const noteParagraphs = buildNoteParagraphs(quote.note);
  const lineItem = buildLineItem(quote, serviceLabels[quote.serviceType]);
  const prezzoNetto = quote.prezzoVenduto ?? lineItem.listPrice;
  const discountPct =
    quote.prezzoVenduto != null
      ? computeDiscountPct(lineItem.listPrice, quote.prezzoVenduto)
      : null;

  const dataDocumento = new Date().toLocaleDateString("it-IT");
  const isPersonaFisica = client.tipo === "PERSONA_FISICA";
  const totaleIva = isPersonaFisica ? prezzoNetto * ALIQUOTA_IVA : 0;
  const totaleConIva = prezzoNetto + totaleIva;

  return (
    <div className="mx-auto max-w-3xl p-6 print:p-0">
      <div className="mb-6">
        <PrintButton />
      </div>

      <div className="flex flex-col gap-6 rounded-xl border border-zinc-200 bg-white p-8 text-zinc-900 print:border-0 print:p-0">
        <header className="flex items-start justify-between gap-6">
          <div className="flex flex-col gap-2">
            <Image src="/logo.png" alt="Toretto" width={180} height={52} />
            <div className="w-44 rounded-lg border border-zinc-300">
              <p className="border-b border-zinc-300 bg-zinc-50 px-1.5 py-0.5 text-center text-[9px] font-semibold uppercase leading-none tracking-wide text-zinc-700">
                Offerta
              </p>
              <div className="flex">
                <InfoCol label="N. Doc." value={String(quote.numeroOfferta)} />
                <InfoCol label="Data" value={dataDocumento} />
                <InfoCol label="Pag." value="1/1" />
              </div>
            </div>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">SPETT.LE</p>
            <p>{clientName}</p>
            {client.indirizzo && <p>{client.indirizzo}</p>}
            {(client.cap || client.citta) && (
              <p>
                {client.cap} {client.citta}
                {client.provincia ? ` (${client.provincia})` : ""}
              </p>
            )}
          </div>
        </header>

        <div className="rounded-lg border border-zinc-300">
          <div className="flex border-b border-zinc-300">
            <InfoCol
              label="Cod. cliente"
              value={String(client.codiceCliente).padStart(6, "0")}
            />
            <InfoCol label="P. IVA" value={client.partitaIva ?? ""} />
            <InfoCol label="Codice fiscale" value={client.codiceFiscale ?? ""} />
            <InfoCol
              label="Persona di riferimento"
              value={client.personaRiferimento ?? ""}
            />
          </div>
          <div className="flex">
            <InfoCol label="Banca d'appoggio" value={BANCA_APPOGGIO} />
            <InfoCol
              label="Condizioni di pagamento"
              value={quote.condizioniPagamento ?? CONDIZIONI_PAGAMENTO_DEFAULT}
            />
          </div>
        </div>

        <table className="w-full border border-zinc-300 text-xs">
          <thead>
            <tr className="border-b border-zinc-300 bg-zinc-50">
              <th className="border-r border-zinc-300 px-2 py-2 text-left">
                Descrizione
              </th>
              <th className="border-r border-zinc-300 px-2 py-2">
                Prezzo unitario
              </th>
              <th className="border-r border-zinc-300 px-2 py-2">Sconto</th>
              <th className="px-2 py-2">Prezzo netto</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border-r border-t border-zinc-300 px-2 py-2 align-top">
                {quote.tipoPrestazione && (
                  <p className="font-semibold uppercase">
                    {quote.tipoPrestazione}
                  </p>
                )}
                <p className="mt-1 font-medium">{lineItem.descrizione}</p>
                <p className="mt-1 text-zinc-600">
                  Sede dell&apos;intervento: {quote.site.address}
                </p>
                {descriptionLines.map((line, i) => (
                  <p key={i} className="mt-1 text-zinc-700">
                    {line}
                  </p>
                ))}
                {noteParagraphs.map((paragraph, i) => (
                  <p key={i} className="mt-3 text-zinc-700">
                    {paragraph}
                  </p>
                ))}
              </td>
              <td className="border-r border-t border-zinc-300 px-2 py-2 text-right align-top">
                {formatEuro(lineItem.prezzoUnitario)}
              </td>
              <td className="border-r border-t border-zinc-300 px-2 py-2 text-center align-top">
                {discountPct != null ? `${(discountPct * 100).toFixed(0)}%` : ""}
              </td>
              <td className="border-t border-zinc-300 px-2 py-2 text-right align-top">
                {formatEuro(prezzoNetto)}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-72 rounded-lg border border-zinc-300 px-4 py-2">
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-xs text-zinc-500">Totale</p>
              <p className="text-lg font-semibold">{formatEuro(prezzoNetto)}</p>
            </div>
            {isPersonaFisica && (
              <>
                <div className="mt-1 flex items-baseline justify-between gap-4 text-xs text-zinc-500">
                  <p>IVA 22%</p>
                  <p>{formatEuro(totaleIva)}</p>
                </div>
                <div className="flex items-baseline justify-between gap-4 text-sm font-semibold">
                  <p>Totale IVA inclusa</p>
                  <p>{formatEuro(totaleConIva)}</p>
                </div>
              </>
            )}
          </div>
        </div>

        <p className="text-xs font-medium text-zinc-700">
          {isPersonaFisica ? NOTA_IVA_PRIVATI : NOTA_REVERSE_CHARGE}
        </p>

        <p className="text-xs text-zinc-500">
          I rifiuti prodotti dalle attività restano a carico del committente.
          In caso di accettazione, firmare nell&apos;apposito spazio e
          rispedire. La firma darà inizio ai lavori. Le clausole generali
          allegate costituiscono parte integrante del contratto in caso di
          accettazione.
        </p>

        <div className="flex items-end justify-between border-t border-zinc-200 pt-4 text-xs text-zinc-500">
          <div>
            <p className="mb-8 font-medium">
              Timbro e firma per accettazione
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-zinc-900">Enrico Tavernese</p>
            <p>Via Poliziano 41/A</p>
            <p>10153 Torino (TO)</p>
            <p>Tel.: 011 062 1320</p>
            <p>Email: info@toret-to.it</p>
            <p>Partita IVA 10844590017 — Codice Fiscale: TVRNRC78R14L219R</p>
          </div>
        </div>
      </div>
    </div>
  );
}
