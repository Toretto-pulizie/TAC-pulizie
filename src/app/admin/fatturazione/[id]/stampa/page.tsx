import { notFound } from "next/navigation";
import { requireModule } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { clientDisplayName } from "@/lib/clients";
import { getBankSettings, formatBancaAppoggio } from "@/lib/bankSettings";
import {
  ALIQUOTA_IVA,
  CONDIZIONI_PAGAMENTO_DEFAULT,
  NOTA_IVA_PRIVATI,
  NOTA_REVERSE_CHARGE,
  SIGNATURE_LINE,
  SITE_LINE,
  formatEuro,
} from "@/lib/pdf/stampaConstants";
import { PrintButton } from "./PrintButton";

const NOTA_ESENTE = "Operazione esente da IVA.";

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
    <div className="border-r border-zinc-300 last:border-r-0" style={{ flex }}>
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

export default async function StampaFatturaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pdf?: string }>;
}) {
  await requireModule("fatturazione");
  const { id } = await params;
  const { pdf } = await searchParams;
  const isPdfMode = pdf === "1";

  const [invoice, bankSettings] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: { client: true, righe: { orderBy: { ordine: "asc" } } },
    }),
    getBankSettings(),
  ]);
  if (!invoice) notFound();
  const bancaAppoggio = formatBancaAppoggio(bankSettings);

  const client = invoice.client;
  const clientName = clientDisplayName(client);
  const numeroLabel = invoice.numero != null ? `${invoice.numero}/${invoice.anno}` : "BOZZA";
  const dataDocumento = invoice.data.toLocaleDateString("it-IT");

  const imponibile = invoice.righe.reduce((sum, r) => sum + r.importo, 0);
  const isStandard = invoice.regimeIva === "STANDARD";
  const totaleIva = isStandard ? imponibile * ALIQUOTA_IVA : 0;
  const totaleConIva = imponibile + totaleIva;

  const legalNote =
    invoice.regimeIva === "STANDARD"
      ? NOTA_IVA_PRIVATI
      : invoice.regimeIva === "ESENTE"
        ? NOTA_ESENTE
        : NOTA_REVERSE_CHARGE;

  const headerSection = (
    <>
      <header className="flex items-start justify-between gap-6">
        <div className="flex flex-col gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Toretto" width={260} height={75} />
          <div className="mt-[30px] w-[176px] rounded-lg border border-zinc-300">
            <p className="border-b border-zinc-300 bg-zinc-50 px-1.5 py-0.5 text-center text-[9px] font-semibold uppercase leading-none tracking-wide text-zinc-700">
              Fattura
            </p>
            <div className="flex">
              <InfoCol label="N. Doc." value={numeroLabel} bold flex={1} center />
              <InfoCol label="Data" value={dataDocumento} bold flex={1.4} center />
              <InfoCol label="Pag." value="1/1" flex={1} center />
            </div>
          </div>
        </div>
        <div className="mr-8 text-left text-sm">
          <p>SPETT.LE</p>
          <p className="font-semibold">{clientName}</p>
          {client.indirizzo && <p className="font-semibold">{client.indirizzo}</p>}
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
            value={client.codiceCliente != null ? String(client.codiceCliente).padStart(6, "0") : "—"}
          />
          <InfoCol label="P. IVA" value={client.partitaIva ?? ""} />
          <InfoCol label="Codice fiscale" value={client.codiceFiscale ?? ""} />
          <InfoCol label="Persona di riferimento" value={client.personaRiferimento ?? ""} />
        </div>
        <div className="flex">
          <InfoCol label="Banca d'appoggio" value={bancaAppoggio} flex={3} />
          <InfoCol
            label="Condizioni di pagamento"
            value={invoice.condizioniPagamento ?? CONDIZIONI_PAGAMENTO_DEFAULT}
            flex={1}
          />
        </div>
      </div>
    </>
  );

  const colgroupEl = (
    <colgroup>
      <col className="w-[55%]" />
      <col className="w-[12%]" />
      <col className="w-[16%]" />
      <col className="w-[17%]" />
    </colgroup>
  );

  const theadEl = (
    <thead>
      <tr className="border-b border-zinc-300 bg-zinc-50">
        <th className="border-r border-zinc-300 px-2 py-2 text-left">Descrizione</th>
        <th className="border-r border-zinc-300 whitespace-nowrap px-1 py-2">Quantità</th>
        <th className="border-r border-zinc-300 whitespace-nowrap px-1 py-2">Prezzo unitario</th>
        <th className="whitespace-nowrap px-1 py-2">Importo</th>
      </tr>
      <tr aria-hidden="true">
        <td colSpan={4} style={{ height: "3mm", padding: 0, border: "none" }} />
      </tr>
    </thead>
  );

  const tableSection = (
    <div
      className="rounded-lg border border-zinc-300"
      style={{ boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}
    >
      <table className="w-full table-fixed text-xs">
        {colgroupEl}
        {theadEl}
        <tbody>
          {invoice.righe.map((r) => (
            <tr key={r.id}>
              <td className="border-r border-t border-zinc-300 px-2 py-2 align-top whitespace-pre-line break-words">
                {r.descrizione}
              </td>
              <td className="border-r border-t border-zinc-300 px-2 py-2 text-right align-top">
                {r.quantita}
              </td>
              <td className="border-r border-t border-zinc-300 px-2 py-2 text-right align-top">
                {formatEuro(r.prezzoUnitario)}
              </td>
              <td className="border-t border-zinc-300 px-2 py-2 text-right align-top">
                {formatEuro(r.importo)}
              </td>
            </tr>
          ))}
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
      <div className="rounded-lg border border-zinc-300 flex justify-end">
        <div className="w-[224px] p-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500">Imponibile</p>
            <p className="text-lg font-semibold text-zinc-900">{formatEuro(imponibile)}</p>
          </div>
          {isStandard ? (
            <>
              <p className="mt-1 text-xs text-zinc-500">IVA 22%: {formatEuro(totaleIva)}</p>
              <p className="text-sm font-semibold text-zinc-900">
                Totale documento: {formatEuro(totaleConIva)}
              </p>
            </>
          ) : (
            <p className="mt-1 text-xs text-zinc-500">IVA non addebitata</p>
          )}
        </div>
      </div>

      <div className="text-center text-[10px] text-zinc-900">
        <p className="mt-1 font-bold">{SIGNATURE_LINE}</p>
        <p className="font-bold">{SITE_LINE}</p>
      </div>
    </>
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
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
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
        <PrintButton invoiceId={invoice.id} />
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
