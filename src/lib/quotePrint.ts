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

export function buildDescriptionLines(q: QuotePricingInput & { note?: string | null }) {
  const lines: string[] = [];

  if (q.serviceType === "ONE_SHOT") {
    lines.push(
      `Intervento una tantum di pulizia (${q.oneShotCount} intervento${
        q.oneShotCount > 1 ? "i" : ""
      }), ${q.ore} ore per intervento più ${q.spostamento} ore di spostamento.`
    );
  } else if (q.serviceType === "PASS_SETTIMANALE") {
    const n = q.passSettimanale ?? 0;
    lines.push(
      `Abbonamento di pulizia con cadenza settimanale: ${n} intervent${
        n === 1 ? "o" : "i"
      }/settimana da ${q.ore} ore, più ${q.spostamento} ore di spostamento per intervento.`
    );
  } else {
    const n = q.passMensile ?? 0;
    lines.push(
      `Abbonamento di pulizia con cadenza mensile: ${n} intervent${
        n === 1 ? "o" : "i"
      }/mese da ${q.ore} ore, più ${q.spostamento} ore di spostamento per intervento.`
    );
  }

  if (q.oreVetri > 0 && q.passVetriAnno > 0) {
    lines.push(
      `Pulizia vetri: ${q.oreVetri} ore, ${q.passVetriAnno} intervent${
        q.passVetriAnno === 1 ? "o" : "i"
      }/anno.`
    );
  }

  if (q.note) {
    for (const paragraph of q.note.split(/\n+/)) {
      const trimmed = paragraph.trim();
      if (trimmed) lines.push(trimmed);
    }
  }

  return lines;
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
