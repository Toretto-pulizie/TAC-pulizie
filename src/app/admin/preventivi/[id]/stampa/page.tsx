import { Fragment } from "react";
import { notFound } from "next/navigation";
import { requireModule } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { computeDiscountPct } from "@/lib/quotes";
import {
  buildDescriptionBlocks,
  buildLineItem,
  type DescriptionBlock,
} from "@/lib/quotePrint";
import {
  getServiceTypeLabels,
  getServiceTypeMostraCadenza,
} from "@/lib/serviceTypeLabels";
import {
  ALIQUOTA_IVA,
  CONDIZIONI_PAGAMENTO_DEFAULT,
  NOTA_IVA_PRIVATI,
  NOTA_REVERSE_CHARGE,
  SIGNATURE_LINE,
  SITE_LINE,
  VALIDITA_GIORNI,
  formatEuro,
} from "@/lib/pdf/stampaConstants";
import { getBankSettings, formatBancaAppoggio } from "@/lib/bankSettings";
import { PrintButton } from "./PrintButton";

function InfoCol({
  label,
  value,
  bold,
  flex = 1,
  center,
}: {
  label: string;
  value?: string;
  bold?: boolean;
  flex?: number;
  center?: boolean;
}) {
  return (
    <div
      className="border-r border-zinc-300 last:border-r-0"
      style={{ flex }}
    >
      <p
        className={`border-b border-zinc-300 bg-zinc-50 px-1.5 py-0.5 text-[8px] uppercase leading-none tracking-wide text-zinc-500 ${center ? "text-center" : ""}`}
      >
        {label}
      </p>
      <p
        className={`truncate px-1.5 py-0.5 text-[11px] leading-tight text-zinc-900 ${bold ? "font-bold" : ""} ${center ? "text-center" : ""}`}
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
  await requireModule("preventivi");
  const { id } = await params;
  const { pdf, totale } = await searchParams;
  const isPdfMode = pdf === "1";

  const [quote, serviceLabels, mostraCadenzaSettings, bankSettings] =
    await Promise.all([
      prisma.quote.findUnique({
        where: { id },
        include: {
          client: true,
          sites: { include: { site: true } },
          attachments: { include: { attachment: true }, orderBy: { ordine: "asc" } },
        },
      }),
      getServiceTypeLabels(),
      getServiceTypeMostraCadenza(),
      getBankSettings(),
    ]);
  if (!quote) notFound();
  const bancaAppoggio = formatBancaAppoggio(bankSettings);

  const client = quote.client;
  const clientName =
    client.tipo === "PERSONA_FISICA"
      ? `${client.cognome ?? ""} ${client.nome ?? ""}`.trim()
      : (client.ragioneSociale ?? client.name);

  const multiSede = quote.sites.length > 1;

  // Una riga per sede: ogni QuoteSite ha il proprio listino/sconto/netto, le
  // proprie note e il proprio Tipo servizio, del tutto indipendenti.
  const siteRows = quote.sites.map((qs) => {
    const lineItem = buildLineItem(qs, serviceLabels[qs.serviceType]);
    // L'adeguamento, se presente, sostituisce il Netto come prezzo finale.
    const prezzoNetto = qs.adeguamento ?? qs.prezzoVenduto ?? lineItem.listPrice;
    // Lo sconto riflette listino → netto (prima dell'adeguamento manuale).
    const discountPct =
      qs.prezzoVenduto != null
        ? computeDiscountPct(lineItem.listPrice, qs.prezzoVenduto)
        : null;
    const blocks = buildDescriptionBlocks(
      { ...qs, site: qs.site },
      serviceLabels[qs.serviceType],
      mostraCadenzaSettings[qs.serviceType]
    );
    return { lineItem, prezzoNetto, discountPct, blocks };
  });

  const prezzoNetto = siteRows.reduce((sum, r) => sum + r.prezzoNetto, 0);
  const listinoTotale = siteRows.reduce((sum, r) => sum + r.lineItem.prezzoUnitario, 0);

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
                flex={1}
                center
              />
              <InfoCol label="Data" value={dataDocumento} bold flex={1.4} center />
              <InfoCol label="Pag." value="1/1" flex={1} center />
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
          <InfoCol label="Banca d'appoggio" value={bancaAppoggio} flex={3} />
          <InfoCol
            label="Condizioni di pagamento"
            value={quote.condizioniPagamento ?? CONDIZIONI_PAGAMENTO_DEFAULT}
            flex={1}
          />
        </div>
      </div>
    </>
  );

  function blockClassName(type: DescriptionBlock["type"]) {
    // Niente break-inside-avoid: un paragrafo lungo (es. l'elenco di una
    // nota) deve poter proseguire da una pagina all'altra invece di saltare
    // per intero alla pagina successiva lasciando spazio vuoto dietro di sé.
    if (type === "address") return "break-words whitespace-pre-line uppercase text-zinc-600";
    if (type === "tipo") return "mt-1 break-words whitespace-pre-line uppercase font-bold";
    if (type === "note") return "mt-3 break-words whitespace-pre-line text-zinc-700";
    if (type === "note-title") return "mt-3 break-words whitespace-pre-line text-zinc-900 font-bold";
    if (type === "note-html")
      return "mt-3 break-words text-zinc-700 [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_u]:underline";
    return "mt-1 break-words whitespace-pre-line uppercase text-zinc-700";
  }

  // Titoli/etichette in neretto, valori (indirizzo, resto della cadenza) in
  // testo normale: solo "tipo" e "note-title" sono interamente in grassetto
  // (gestito da blockClassName), gli altri tipi mescolano le due cose sulla
  // stessa riga. "note-html" ha un rendering a parte (dangerouslySetInnerHTML)
  // perché contiene già la propria formattazione inline.
  function blockContent(block: Exclude<DescriptionBlock, { type: "note-html" }>) {
    if (block.type === "address")
      return (
        <>
          <span className="font-bold text-zinc-900">{block.label}</span> {block.value}
        </>
      );
    if (block.type === "line")
      return (
        <>
          <span className="font-bold text-zinc-900">
            {block.label} {block.boldValue}
          </span>
          {block.rest}
        </>
      );
    return block.text;
  }

  const colgroupEl = (
    <colgroup>
      <col className="w-[62%]" />
      <col className="w-[16%]" />
      <col className="w-[8%]" />
      <col className="w-[14%]" />
    </colgroup>
  );

  const theadEl = (
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
      {/* Riga spaziatrice: fa parte del thead, quindi si ripete su ogni
          pagina insieme all'intestazione — garantisce sempre 3mm di
          distanza sotto "Descrizione", anche dove una pagina ricomincia
          nel mezzo di un paragrafo. */}
      <tr aria-hidden="true">
        <td colSpan={4} style={{ height: "3mm", padding: 0, border: "none" }} />
      </tr>
    </thead>
  );

  const summaryRowsEl = siteRows.map((r, i) => (
    <tr key={i}>
      <td className="border-r border-t border-b border-zinc-300 px-2 py-2 font-semibold text-zinc-900">
        {multiSede ? `Valore del servizio — ${quote.sites[i].site.name}` : "Valore del servizio"}
      </td>
      <td className="border-r border-t border-b border-zinc-300 px-2 py-2 text-right">
        {formatEuro(r.lineItem.prezzoUnitario)}
      </td>
      <td className="border-r border-t border-b border-zinc-300 px-2 py-2 text-center">
        {r.discountPct != null ? `${(r.discountPct * 100).toFixed(0)}%` : ""}
      </td>
      <td className="border-t border-b border-zinc-300 px-2 py-2 text-right">
        {formatEuro(r.prezzoNetto)}
      </td>
    </tr>
  ));

  const totaleComplessivoRowEl = multiSede ? (
    <tr>
      <td className="border-r border-t border-b border-zinc-300 px-2 py-2 text-right font-semibold text-zinc-900">
        Totale complessivo
      </td>
      <td className="border-r border-t border-b border-zinc-300 px-2 py-2 text-right font-semibold text-zinc-900">
        {formatEuro(listinoTotale)}
      </td>
      <td className="border-r border-t border-b border-zinc-300 px-2 py-2"></td>
      <td className="border-t border-b border-zinc-300 px-2 py-2 text-right font-semibold text-zinc-900">
        {formatEuro(prezzoNetto)}
      </td>
    </tr>
  ) : null;

  // Un'unica tabella continua: è il browser stesso a decidere dove tagliarla
  // tra una pagina fisica e l'altra (ripetendo il <thead> automaticamente),
  // invece di stimare noi l'altezza disponibile — questo garantisce che la
  // pagina si riempia sempre fino in fondo davvero. boxDecorationBreak:clone
  // fa sì che ogni pagina riceva comunque un riquadro completo e chiuso
  // (bordo e angoli arrotondati propri), come se fosse indipendente.
  const tableSection = (
    <div
      className="rounded-lg border border-zinc-300"
      style={{
        boxDecorationBreak: "clone",
        WebkitBoxDecorationBreak: "clone",
      }}
    >
      <table className="w-full table-fixed text-xs">
        {colgroupEl}
        {theadEl}
        <tbody>
          {siteRows.map((r, i) => (
            <Fragment key={i}>
              <tr>
                <td className="border-r border-zinc-300 px-2 py-2 align-top">
                  {r.blocks.map((block, j) =>
                    block.type === "note-html" ? (
                      <div
                        key={j}
                        className={blockClassName(block.type)}
                        dangerouslySetInnerHTML={{ __html: block.html }}
                      />
                    ) : (
                      <p key={j} className={blockClassName(block.type)}>
                        {blockContent(block)}
                      </p>
                    )
                  )}
                </td>
                <td className="border-r border-zinc-300 px-2 py-2"></td>
                <td className="border-r border-zinc-300 px-2 py-2"></td>
                <td className="px-2 py-2"></td>
              </tr>
              {summaryRowsEl[i]}
            </Fragment>
          ))}
          {totaleComplessivoRowEl}
        </tbody>
      </table>
    </div>
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

  // Gli allegati (PDF caricati in Impostazioni) non vengono renderizzati
  // qui: restano invariati con la propria formattazione e sono uniti al PDF
  // finale come pagine a parte da pdf/route.ts. Qui si mostra solo un
  // richiamo/anteprima, utile nella pagina di anteprima a schermo.
  const allegatiSection = quote.attachments.length > 0 && (
    <div className="rounded-lg border border-zinc-300 p-3 text-[10px] text-zinc-700">
      <p className="mb-1 font-semibold uppercase tracking-wide text-zinc-500">
        Allegati inclusi in stampa
      </p>
      <ul className="flex flex-col gap-1">
        {quote.attachments.map((qa) => (
          <li key={qa.id}>
            <a
              href={`/admin/allegati/${qa.attachment.id}`}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              {qa.attachment.nome} ↗
            </a>
          </li>
        ))}
      </ul>
    </div>
  );

  if (isPdfMode) {
    return (
      <div className="bg-white p-0 text-zinc-900">
        <div
          className="fixed top-0 right-[1.5mm] bottom-0 z-10 flex items-center justify-center"
          style={{ width: "16px" }}
        >
          <p
            className="whitespace-nowrap text-[6px] text-zinc-500"
            style={{
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
            }}
          >
            {legalNote}
          </p>
        </div>
        <div className="pr-[9.5mm] pl-[6mm]">{tableSection}</div>
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

      {allegatiSection && (
        <div className="mt-4 print:hidden">{allegatiSection}</div>
      )}
    </div>
  );
}
