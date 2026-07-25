import type { ServiceType } from "@prisma/client";
import { computeListPrice, type QuotePricingInput } from "@/lib/quotes";

export function labelWithFrequency(
  serviceType: ServiceType,
  label: string,
  passSettimanale: number | null,
  passMensile: number | null
) {
  if (serviceType === "PASS_SETTIMANALE") {
    const n = passSettimanale ?? 0;
    return `${label} (${n} intervent${n === 1 ? "o" : "i"}/settimana)`;
  }
  if (serviceType === "PASS_MENSILE") {
    const n = passMensile ?? 0;
    return `${label} (${n} intervent${n === 1 ? "o" : "i"}/mese)`;
  }
  return label;
}

export function buildDescriptionLines(q: QuotePricingInput) {
  const lines: string[] = [];

  if (q.serviceType === "ONE_SHOT") {
    lines.push(
      `Intervento una tantum di pulizia (${q.oneShotCount} intervento${
        q.oneShotCount > 1 ? "i" : ""
      }), ${q.ore} ore per intervento più ${q.spostamento} ore di spostamento.`
    );
  }

  if (q.oreVetri > 0 && q.passVetriAnno > 0) {
    lines.push(
      `Pulizia vetri: ${q.oreVetri} ore, ${q.passVetriAnno} intervent${
        q.passVetriAnno === 1 ? "o" : "i"
      }/anno.`
    );
  }

  return lines;
}

export function buildCadenzaLine(q: QuotePricingInput): string | null {
  if (q.serviceType === "PASS_SETTIMANALE") {
    const n = q.passSettimanale ?? 0;
    const passaggio = n === 1 ? "passaggio" : "passaggi";
    const settimanale = n === 1 ? "settimanale" : "settimanali";
    const distribuito = n === 1 ? "distribuito" : "distribuiti";
    return `Cadenza: n° ${n} ${passaggio} ${settimanale} così ${distribuito}`;
  }
  if (q.serviceType === "PASS_MENSILE") {
    const n = q.passMensile ?? 0;
    const passaggio = n === 1 ? "passaggio" : "passaggi";
    const mensile = n === 1 ? "mensile" : "mensili";
    const distribuito = n === 1 ? "distribuito" : "distribuiti";
    return `Cadenza: n° ${n} ${passaggio} ${mensile} così ${distribuito}`;
  }
  return null;
}

export function buildNoteParagraphs(note?: string | null) {
  if (!note) return [];
  return note
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export type DescriptionBlock =
  | { type: "tipo"; text: string }
  | { type: "address"; text: string }
  | { type: "cadenza"; text: string }
  | { type: "line"; text: string }
  | { type: "note"; text: string };

// The description table cell's content, flattened into an ordered list of
// paginatable units (one per <p>). Shared between the on-screen preview and
// the PDF route so both measure and render the exact same blocks in the
// exact same order — the PDF route splits these across per-page tables
// using heights measured from this same markup.
export function buildDescriptionBlocks(
  q: QuotePricingInput & { tipoPrestazione?: string | null; site: { address: string } },
  descriptionLines: string[],
  cadenzaLine: string | null,
  noteParagraphs: string[]
): DescriptionBlock[] {
  const blocks: DescriptionBlock[] = [];
  if (q.tipoPrestazione) blocks.push({ type: "tipo", text: q.tipoPrestazione });
  blocks.push({
    type: "address",
    text: `Sede dell'intervento: ${q.site.address}`,
  });
  if (cadenzaLine) blocks.push({ type: "cadenza", text: cadenzaLine });
  for (const line of descriptionLines) blocks.push({ type: "line", text: line });
  for (const paragraph of noteParagraphs)
    blocks.push({ type: "note", text: paragraph });
  return blocks;
}

export function buildLineItem(q: QuotePricingInput, serviceLabel: string) {
  const listPrice = computeListPrice(q);
  const isOneShot = q.serviceType === "ONE_SHOT";
  const quantita = isOneShot ? q.oneShotCount : 1;
  const prezzoUnitario = isOneShot ? listPrice / q.oneShotCount : listPrice;
  const um = isOneShot ? "NR" : "MESE";
  const descrizione = labelWithFrequency(
    q.serviceType,
    serviceLabel,
    q.passSettimanale ?? null,
    q.passMensile ?? null
  );
  return { descrizione, um, quantita, prezzoUnitario, listPrice };
}
