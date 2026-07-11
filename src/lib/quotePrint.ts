import type { ServiceType } from "@prisma/client";
import { computeListPrice, type QuotePricingInput } from "@/lib/quotes";

export function buildDescriptionLines(q: QuotePricingInput & { note?: string | null }) {
  const lines: string[] = [];

  if (q.serviceType === "ONE_SHOT") {
    lines.push(
      `Intervento una tantum di pulizia (${q.oneShotCount} intervento${
        q.oneShotCount > 1 ? "i" : ""
      }), ${q.ore} ore per intervento più ${q.spostamento} ore di spostamento.`
    );
  } else if (q.serviceType === "PASS_SETTIMANALE") {
    lines.push(
      `Abbonamento di pulizia con cadenza settimanale: ${q.passSettimanale} intervent${
        (q.passSettimanale ?? 0) === 1 ? "o" : "i"
      }/settimana da ${q.ore} ore, più ${q.spostamento} ore di spostamento per intervento.`
    );
  } else {
    lines.push(
      `Abbonamento di pulizia con cadenza mensile: ${q.passMensile} intervent${
        (q.passMensile ?? 0) === 1 ? "o" : "i"
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
    lines.push(q.note);
  }

  return lines;
}

export function buildLineItem(q: QuotePricingInput) {
  const listPrice = computeListPrice(q);
  const isOneShot = q.serviceType === "ONE_SHOT";
  const quantita = isOneShot ? q.oneShotCount : 1;
  const prezzoUnitario = isOneShot ? listPrice / q.oneShotCount : listPrice;
  const um = isOneShot ? "NR" : "MESE";
  const descrizione = serviceLabel(q.serviceType);
  return { descrizione, um, quantita, prezzoUnitario, listPrice };
}

export function serviceLabel(serviceType: ServiceType) {
  switch (serviceType) {
    case "ONE_SHOT":
      return "Servizio di pulizia una tantum";
    case "PASS_SETTIMANALE":
      return "Servizio di pulizia — abbonamento settimanale";
    case "PASS_MENSILE":
      return "Servizio di pulizia — abbonamento mensile";
  }
}
