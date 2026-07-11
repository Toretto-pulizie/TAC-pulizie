import Image from "next/image";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { computeDiscountPct } from "@/lib/quotes";
import { buildDescriptionLines, buildLineItem } from "@/lib/quotePrint";
import { PrintButton } from "./PrintButton";

function formatEuro(n: number) {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

export default async function StampaPreventivoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: { site: { include: { client: true } } },
  });
  if (!quote) notFound();

  const client = quote.site.client;
  const clientName =
    client.tipo === "PERSONA_FISICA"
      ? `${client.nome ?? ""} ${client.cognome ?? ""}`.trim()
      : client.ragioneSociale ?? client.name;

  const descriptionLines = buildDescriptionLines(quote);
  const lineItem = buildLineItem(quote);
  const prezzoNetto = quote.prezzoVenduto ?? lineItem.listPrice;
  const discountPct =
    quote.prezzoVenduto != null
      ? computeDiscountPct(lineItem.listPrice, quote.prezzoVenduto)
      : null;

  const dataDocumento = new Date().toLocaleDateString("it-IT");

  return (
    <div className="mx-auto max-w-3xl p-6 print:p-0">
      <div className="mb-6">
        <PrintButton />
      </div>

      <div className="flex flex-col gap-6 rounded-xl border border-zinc-200 bg-white p-8 text-zinc-900 print:border-0 print:p-0">
        <header className="flex items-start justify-between gap-6">
          <Image src="/logo.png" alt="Toretto" width={180} height={52} />
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

        <div className="flex items-center justify-between border-y border-zinc-200 py-2 text-sm">
          <p className="font-semibold uppercase tracking-wide">Offerta</p>
          <p className="text-zinc-500">Data: {dataDocumento}</p>
        </div>

        <section className="text-sm">
          <p className="mb-2 font-medium">
            {client.name} — {quote.site.name}
          </p>
          {descriptionLines.map((line, i) => (
            <p key={i} className="mb-1 text-zinc-700">
              {line}
            </p>
          ))}
        </section>

        <table className="w-full border border-zinc-300 text-xs">
          <thead>
            <tr className="border-b border-zinc-300 bg-zinc-50">
              <th className="border-r border-zinc-300 px-2 py-2 text-left">
                Descrizione
              </th>
              <th className="border-r border-zinc-300 px-2 py-2">UM</th>
              <th className="border-r border-zinc-300 px-2 py-2">Quantità</th>
              <th className="border-r border-zinc-300 px-2 py-2">
                Prezzo unitario
              </th>
              <th className="border-r border-zinc-300 px-2 py-2">Sc.%</th>
              <th className="px-2 py-2">Prezzo netto</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border-r border-t border-zinc-300 px-2 py-2">
                {lineItem.descrizione}
              </td>
              <td className="border-r border-t border-zinc-300 px-2 py-2 text-center">
                {lineItem.um}
              </td>
              <td className="border-r border-t border-zinc-300 px-2 py-2 text-center">
                {lineItem.quantita.toFixed(2)}
              </td>
              <td className="border-r border-t border-zinc-300 px-2 py-2 text-right">
                {formatEuro(lineItem.prezzoUnitario)}
              </td>
              <td className="border-r border-t border-zinc-300 px-2 py-2 text-center">
                {discountPct != null ? `${(discountPct * 100).toFixed(0)}%` : ""}
              </td>
              <td className="border-t border-zinc-300 px-2 py-2 text-right">
                {formatEuro(prezzoNetto)}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="rounded-lg border border-zinc-300 px-4 py-2 text-right">
            <p className="text-xs text-zinc-500">Totale IVA esclusa</p>
            <p className="text-lg font-semibold">{formatEuro(prezzoNetto)}</p>
          </div>
        </div>

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
