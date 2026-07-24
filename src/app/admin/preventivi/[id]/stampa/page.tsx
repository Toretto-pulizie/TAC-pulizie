import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { computeDiscountPct } from "@/lib/quotes";
import {
  buildCadenzaLine,
  buildDescriptionLines,
  buildLineItem,
  buildNoteParagraphs,
} from "@/lib/quotePrint";
import { getServiceTypeLabels } from "@/lib/serviceTypeLabels";
import {
  ALIQUOTA_IVA,
  BANCA_APPOGGIO,
  CONDIZIONI_PAGAMENTO_DEFAULT,
  NOTA_IVA_PRIVATI,
  NOTA_REVERSE_CHARGE,
  SIGNATURE_LINE,
  SITE_LINE,
  VALIDITA_GIORNI,
  formatEuro,
} from "@/lib/pdf/stampaConstants";
import { PrintButton } from "./PrintButton";

function InfoCol({
  label,
  value,
  bold,
}: {
  label: string;
  value?: string;
  bold?: boolean;
}) {
  return (
    <div className="flex-1 border-r border-zinc-300 last:border-r-0">
      <p className="border-b border-zinc-300 bg-zinc-50 px-1.5 py-0.5 text-[8px] uppercase leading-none tracking-wide text-zinc-500">
        {label}
      </p>
      <p
        className={`truncate px-1.5 py-0.5 text-[11px] leading-tight text-zinc-900 ${bold ? "font-bold" : ""}`}
      >
        {value || "—"}
      </p>
    </div>
  );
}

export default async function StampaPreventivoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pdf?: string; totale?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { pdf, totale } = await searchParams;
  const isPdfMode = pdf === "1";

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
      : (client.ragioneSociale ?? client.name);

  const descriptionLines = buildDescriptionLines(quote);
  const cadenzaLine = buildCadenzaLine(quote);
  const noteParagraphs = buildNoteParagraphs(quote.note);
  const lineItem = buildLineItem(quote, serviceLabels[quote.serviceType]);
  const prezzoNetto = quote.prezzoVenduto ?? lineItem.listPrice;
  const discountPct =
    quote.prezzoVenduto != null
      ? computeDiscountPct(lineItem.listPrice, quote.prezzoVenduto)
      : null;

  const dataDocumento = new Date().toLocaleDateString("it-IT");
  const scadenza = new Date();
  scadenza.setDate(scadenza.getDate() + VALIDITA_GIORNI);
  const dataScadenza = scadenza.toLocaleDateString("it-IT");
  const isPersonaFisica = client.tipo === "PERSONA_FISICA";
  const totaleIva = isPersonaFisica ? prezzoNetto * ALIQUOTA_IVA : 0;
  const totaleConIva = prezzoNetto + totaleIva;
  const totaleLabel = totale ?? formatEuro(prezzoNetto);

  const headerSection = (
    <>
      <header className="flex items-start justify-between gap-6">
        <div className="flex flex-col gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Toretto" width={260} height={75} />
          <div className="mt-[30px] w-[176px] rounded-lg border border-zinc-300">
            <p className="border-b border-zinc-300 bg-zinc-50 px-1.5 py-0.5 text-center text-[9px] font-semibold uppercase leading-none tracking-wide text-zinc-700">
              Offerta
            </p>
            <div className="flex">
              <InfoCol
                label="N. Doc."
                value={String(quote.numeroOfferta)}
                bold
              />
              <InfoCol label="Data" value={dataDocumento} bold />
              <InfoCol label="Pag." value="1/1" />
            </div>
          </div>
        </div>
        <div className="mr-8 text-left text-sm">
          <p>SPETT.LE</p>
          <p className="font-semibold">{clientName}</p>
          {client.indirizzo && (
            <p className="font-semibold">{client.indirizzo}</p>
          )}
          {(client.cap || client.citta) && (
            <p className="font-semibold">
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
    </>
  );

  const tableSection = (
    <table className="w-full table-fixed border border-zinc-300 text-xs">
      <colgroup>
        <col className="w-[62%]" />
        <col className="w-[16%]" />
        <col className="w-[8%]" />
        <col className="w-[14%]" />
      </colgroup>
      <thead>
        <tr className="border-b border-zinc-300 bg-zinc-50">
          <th className="border-r border-zinc-300 px-2 py-2 text-left">
            Descrizione
          </th>
          <th className="border-r border-zinc-300 whitespace-nowrap px-1 py-2">
            Prezzo unitario
          </th>
          <th className="border-r border-zinc-300 whitespace-nowrap px-1 py-2">
            Sconto
          </th>
          <th className="whitespace-nowrap px-1 py-2">Prezzo netto</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className="border-r border-t border-zinc-300 px-2 py-2 align-top">
            {quote.tipoPrestazione && (
              <p className="uppercase">{quote.tipoPrestazione}</p>
            )}
            <p className="mt-1 text-zinc-600">
              Sede dell&apos;intervento: {quote.site.address}
            </p>
            {cadenzaLine && (
              <p className="mt-1 text-zinc-700">{cadenzaLine}</p>
            )}
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
          <td className="border-r border-t border-zinc-300 px-2 py-2"></td>
          <td className="border-r border-t border-zinc-300 px-2 py-2"></td>
          <td className="border-t border-zinc-300 px-2 py-2"></td>
        </tr>
        <tr>
          <td className="border-r border-t border-b border-zinc-300 px-2 py-2 font-semibold text-zinc-900">
            Valore del servizio
          </td>
          <td className="border-r border-t border-b border-zinc-300 px-2 py-2 text-right">
            {formatEuro(lineItem.prezzoUnitario)}
          </td>
          <td className="border-r border-t border-b border-zinc-300 px-2 py-2 text-center">
            {discountPct != null ? `${(discountPct * 100).toFixed(0)}%` : ""}
          </td>
          <td className="border-t border-b border-zinc-300 px-2 py-2 text-right">
            {formatEuro(prezzoNetto)}
          </td>
        </tr>
      </tbody>
    </table>
  );

  const mainContent = (
    <>
      {headerSection}
      {tableSection}
    </>
  );

  const footerSection = (
    <>
      <div className="rounded-lg border border-zinc-300">
        <div className="flex border-b border-zinc-300">
          <div className="flex flex-1 items-center justify-center border-r border-zinc-300 p-2 text-center text-[10px] text-zinc-600">
            Valida fino al{" "}
            <span className="ml-1 font-bold text-zinc-900">
              {dataScadenza}
            </span>
          </div>
          <div className="w-[224px] p-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500">Totale</p>
              <p className="text-lg font-semibold text-zinc-900">
                {totaleLabel}
              </p>
            </div>
            {isPersonaFisica && (
              <>
                <p className="mt-1 text-xs text-zinc-500">
                  IVA 22%: {formatEuro(totaleIva)}
                </p>
                <p className="text-sm font-semibold text-zinc-900">
                  Totale IVA inclusa: {formatEuro(totaleConIva)}
                </p>
              </>
            )}
          </div>
        </div>
        <div className="flex">
          <div className="flex-1">
            <p className="border-b border-zinc-300 p-2 text-[10px] font-bold text-zinc-900">
              I rifiuti prodotti dalle attività restano a carico del
              committente.
            </p>
            <p className="p-2 text-[10px] text-zinc-600">
              In caso di accettazione, firmare nell&apos;apposito spazio e
              rispedire. La firma darà inizio ai lavori. Le clausole generali
              allegate costituiscono parte integrante del contratto in caso
              di accettazione.
            </p>
          </div>
          <div className="w-[224px] border-l border-zinc-300 px-2 pt-0.5 pb-2 text-center">
            <p className="text-[10px] font-medium text-zinc-500">
              Timbro e firma per accettazione
            </p>
          </div>
        </div>
      </div>

      <div className="text-center text-[10px] text-zinc-900">
        <p className="mt-1 font-bold">{SIGNATURE_LINE}</p>
        <p className="font-bold">{SITE_LINE}</p>
      </div>
    </>
  );

  const legalNote = isPersonaFisica ? NOTA_IVA_PRIVATI : NOTA_REVERSE_CHARGE;

  if (isPdfMode) {
    return (
      <div className="bg-white p-0 text-zinc-900">
        <div className="fixed top-0 right-0 left-0 z-10 bg-white pt-[6mm] pr-[19mm] pb-[4mm] pl-[12mm]">
          {headerSection}
        </div>
        <div className="fixed right-0 bottom-0 left-0 z-10 bg-white pt-[4mm] pr-[19mm] pb-[6mm] pl-[12mm]">
          {footerSection}
        </div>
        <div
          className="fixed top-0 right-[3mm] bottom-0 z-10 flex items-center justify-center"
          style={{ width: "16px" }}
        >
          <p
            className="whitespace-nowrap text-[7px] text-zinc-500"
            style={{
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
            }}
          >
            {legalNote}
          </p>
        </div>
        <div className="pt-[68mm] pr-[19mm] pb-[52mm] pl-[12mm]">
          {tableSection}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6 print:p-0">
      <div className="mb-6">
        <PrintButton quoteId={quote.id} />
      </div>

      <div className="flex min-h-[297mm] rounded-xl border border-zinc-200 bg-white text-zinc-900 print:border-0">
        <div className="flex flex-1 flex-col gap-6 p-8">
          {mainContent}

          <div className="mt-auto flex flex-col gap-2">{footerSection}</div>
        </div>

        <div className="-ml-6 flex w-4 items-center justify-center">
          <p
            className="whitespace-nowrap text-[7px] text-zinc-500"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            {legalNote}
          </p>
        </div>
      </div>
    </div>
  );
}
