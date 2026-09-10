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

export function buildNoteParagraphs(note?: string | null) {
  if (!note) return [];
  return note
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

// L'indirizzo della sede è salvato come stringa unica (via, cap, città,
// provincia separati da virgola quando composto automaticamente). In stampa
// va mostrato come "Via - Città (Prov)", senza CAP: qui isoliamo ed
// eliminiamo il token CAP e formattiamo l'eventuale sigla provincia tra
// parentesi. Per indirizzi liberi (sede "Altro", struttura non garantita) si
// applica solo quanto riconoscibile, senza spezzare il testo originale.
export function formatSedeAddress(raw: string): string {
  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => !/^\d{5}$/.test(p));
  if (parts.length === 0) return raw.trim();
  const [via, ...rest] = parts;
  if (rest.length === 0) return via;
  const last = rest[rest.length - 1];
  const provMatch = last.match(/^\(?([A-Za-z]{2})\)?$/);
  if (provMatch && rest.length > 1) {
    const citta = rest.slice(0, -1).join(", ");
    return `${via} - ${citta} (${provMatch[1].toUpperCase()})`;
  }
  return `${via} - ${rest.join(", ")}`;
}

export type DescriptionBlock =
  | { type: "tipo"; text: string }
  | { type: "address"; label: string; value: string }
  | { type: "line"; label: string; boldValue: string; rest: string }
  | { type: "line-plain"; text: string }
  | { type: "note"; text: string }
  | { type: "note-title"; text: string };

type StructuredLine = { label: string; boldValue: string; rest: string };

// Ogni tipo di servizio ha il suo riepilogo: per "una tantum" ore/interventi,
// per i passaggi settimanali/mensili la cadenza. L'interruttore "Mostra
// cadenza/riepilogo in stampa" (per tipo, in Impostazioni) decide se questa
// riga compare o meno. Per i passaggi periodici il risultato è strutturato
// (etichetta "Cadenza:" + il numero inserito da evidenziare in neretto in
// stampa, e il resto della frase in testo normale); per "una tantum" resta
// una riga semplice, non essendoci un'etichetta "Cadenza" da mostrare.
function buildRiepilogoLine(
  q: QuotePricingInput
): { plain: string } | StructuredLine | null {
  if (q.serviceType === "ONE_SHOT") {
    return {
      plain: `Intervento una tantum di pulizia (${q.oneShotCount} intervento${
        q.oneShotCount > 1 ? "i" : ""
      }).`,
    };
  }
  if (q.serviceType === "PASS_SETTIMANALE") {
    const n = q.passSettimanale ?? 0;
    const passaggio = n === 1 ? "passaggio" : "passaggi";
    const settimanale = n === 1 ? "settimanale" : "settimanali";
    const distribuito = n === 1 ? "distribuito" : "distribuiti";
    return {
      label: "Cadenza:",
      boldValue: `n° ${n}`,
      rest: ` ${passaggio} ${settimanale} così ${distribuito}`,
    };
  }
  if (q.serviceType === "PASS_MENSILE") {
    const n = q.passMensile ?? 0;
    const passaggio = n === 1 ? "passaggio" : "passaggi";
    const mensile = n === 1 ? "mensile" : "mensili";
    const distribuito = n === 1 ? "distribuito" : "distribuiti";
    return {
      label: "Cadenza:",
      boldValue: `n° ${n}`,
      rest: ` ${passaggio} ${mensile} così ${distribuito}`,
    };
  }
  return null;
}

// The description table cell's content, flattened into an ordered list of
// <p> blocks. Shared between the on-screen preview and the PDF route so
// both render the exact same blocks in the exact same order.
function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n|\r/g, "\n");
}

// Una nota (digitata a mano o inserita da una frase preimpostata) può avere
// una riga-titolo separata da una riga vuota dal corpo (es. "OPERAZIONI DA
// ESEGUIRE:" seguita dall'elenco): quando un paragrafo è una singola riga che
// termina con ":" lo trattiamo come titolo, da evidenziare in neretto.
function isNoteTitle(paragraph: string): boolean {
  return !paragraph.includes("\n") && /:\s*$/.test(paragraph.trim());
}

export function buildDescriptionBlocks(
  q: QuotePricingInput & { tipoPrestazione?: string | null; site: { address: string } },
  serviceLabel: string,
  mostraCadenza: boolean,
  noteParagraphs: string[]
): DescriptionBlock[] {
  const blocks: DescriptionBlock[] = [];
  blocks.push({
    type: "address",
    label: "Sede dell'intervento:",
    value: normalizeLineEndings(formatSedeAddress(q.site.address)),
  });
  if (q.tipoPrestazione)
    blocks.push({ type: "tipo", text: normalizeLineEndings(q.tipoPrestazione) });
  const riepilogo = mostraCadenza ? buildRiepilogoLine(q) : null;
  if (riepilogo && "plain" in riepilogo) {
    blocks.push({ type: "line-plain", text: normalizeLineEndings(riepilogo.plain) });
  } else if (riepilogo) {
    blocks.push({
      type: "line",
      label: riepilogo.label,
      boldValue: riepilogo.boldValue,
      rest: normalizeLineEndings(riepilogo.rest),
    });
  } else {
    blocks.push({ type: "line-plain", text: normalizeLineEndings(serviceLabel) });
  }
  for (const paragraph of noteParagraphs) {
    const normalized = normalizeLineEndings(paragraph);
    blocks.push(
      isNoteTitle(normalized)
        ? { type: "note-title", text: normalized }
        : { type: "note", text: normalized }
    );
  }
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
