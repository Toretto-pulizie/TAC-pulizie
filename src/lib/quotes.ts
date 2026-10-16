import type { ServiceType } from "@prisma/client";

export type QuotePricingInput = {
  serviceType: ServiceType;
  ore: number;
  spostamento: number;
  // Se vero lo spostamento entra nel prezzo di listino, per tutte le frequenze.
  // Se il dato manca (chiamanti che non lo leggono) vale la regola storica:
  // incluso per tutti tranne i Passaggi mensili.
  spostamentoInPrezzo?: boolean | null;
  oneShotCount: number;
  passSettimanale: number | null;
  passMensile: number | null;
  passAnnuali?: number | null;
  oreVetri: number;
  passVetriAnno: number;
  tariffaOraria: number;
  tariffaVetri: number;
};

// Per i "Passaggi annuali" (es. 6 passaggi l'anno) il prezzo si ragiona a
// passaggio, ma in archivio resta l'equivalente mensile (prezzo × passaggi/anno
// ÷ 12): così Commesse, Chiusure, Consuntivi e Statistiche, che lavorano in
// mesi, non cambiano. Queste due funzioni convertono da un lato all'altro.
export function mensileDaPassaggio(prezzoPassaggio: number, passAnnuali: number): number {
  return (prezzoPassaggio * passAnnuali) / 12;
}

export function passaggioDaMensile(mensile: number, passAnnuali: number | null | undefined): number {
  return passAnnuali != null && passAnnuali > 0 ? (mensile * 12) / passAnnuali : mensile;
}

// Listino di una riga. Per PASS_ANNUALE è l'equivalente mensile (come per gli
// altri canoni); il listino a passaggio si ricava con passaggioDaMensile.
export function computeListPrice(q: QuotePricingInput): number {
  const vetriQuota = (q.oreVetri * q.passVetriAnno * q.tariffaVetri) / 12;
  // Ore per passaggio: ore di lavoro + (se incluso) ore di spostamento.
  const inclSpostamento = q.spostamentoInPrezzo ?? q.serviceType !== "PASS_MENSILE";
  const oreTot = q.ore + (inclSpostamento ? q.spostamento : 0);

  switch (q.serviceType) {
    case "ONE_SHOT":
      return oreTot * q.oneShotCount * q.tariffaOraria;
    case "PASS_SETTIMANALE":
      return oreTot * (q.passSettimanale ?? 0) * 4.3 * q.tariffaOraria + vetriQuota;
    case "PASS_MENSILE":
      return (q.passMensile ?? 0) * oreTot * q.tariffaOraria + vetriQuota;
    case "PASS_ANNUALE":
      return (oreTot * q.tariffaOraria * (q.passAnnuali ?? 0)) / 12 + vetriQuota;
  }
}

// Mesi su cui si calcola il valore annuo di un canone: 11 e non 12, perché
// nel mese di chiusura aziendale il canone si riduce o, con le pulizie di
// chiusura e riapertura, si sostituisce parte dei passaggi (art. III delle
// clausole). Es.: 100 €/mese = 1.200 € su 12 mesi, 1.100 € su 11 mesi.
// I passaggi annuali non seguono la regola: valgono tutti i passaggi dell'anno
// (equivalente mensile × 12).
export const MESI_ANNUO = 11;

export function mesiAnnuoPer(serviceType: ServiceType): number {
  return serviceType === "PASS_ANNUALE" ? 12 : MESI_ANNUO;
}

export function computeSoldAnnual(
  serviceType: ServiceType,
  prezzoVenduto: number
): number {
  return serviceType === "ONE_SHOT" ? prezzoVenduto : prezzoVenduto * mesiAnnuoPer(serviceType);
}

// Mese riparametrato: il valore annuo su 11 mesi diviso 12, cioè il canone
// medio mensile "vero" dopo la chiusura aziendale. Es.: 100 €/mese → 1.100 €
// l'anno → 91,67 € al mese. L'una tantum non ha un mese: vale 0.
export function computeMeseRiparametrato(
  serviceType: ServiceType,
  prezzoVenduto: number
): number {
  return serviceType === "ONE_SHOT"
    ? 0
    : (prezzoVenduto * mesiAnnuoPer(serviceType)) / 12;
}

export function computeDiscountPct(
  listPrice: number,
  prezzoVenduto: number
): number | null {
  if (listPrice === 0) return null;
  return (listPrice - prezzoVenduto) / listPrice;
}
