import type { ServiceType } from "@prisma/client";

export type QuotePricingInput = {
  serviceType: ServiceType;
  ore: number;
  spostamento: number;
  oneShotCount: number;
  passSettimanale: number | null;
  passMensile: number | null;
  oreVetri: number;
  passVetriAnno: number;
  tariffaOraria: number;
  tariffaVetri: number;
};

export function computeListPrice(q: QuotePricingInput): number {
  const vetriQuota = (q.oreVetri * q.passVetriAnno * q.tariffaVetri) / 12;

  switch (q.serviceType) {
    case "ONE_SHOT":
      return (q.ore + q.spostamento) * q.oneShotCount * q.tariffaOraria;
    case "PASS_SETTIMANALE":
      return (
        (q.ore + q.spostamento) * (q.passSettimanale ?? 0) * 4.3 * q.tariffaOraria +
        vetriQuota
      );
    case "PASS_MENSILE":
      return (q.passMensile ?? 0) * q.ore * q.tariffaOraria + vetriQuota;
  }
}

// Mesi su cui si calcola il valore annuo di un canone: 11 e non 12, perché
// nel mese di chiusura aziendale il canone si riduce o, con le pulizie di
// chiusura e riapertura, si sostituisce parte dei passaggi (art. III delle
// clausole). Es.: 100 €/mese = 1.200 € su 12 mesi, 1.100 € su 11 mesi.
export const MESI_ANNUO = 11;

export function computeSoldAnnual(
  serviceType: ServiceType,
  prezzoVenduto: number
): number {
  return serviceType === "ONE_SHOT" ? prezzoVenduto : prezzoVenduto * MESI_ANNUO;
}

// Mese riparametrato: il valore annuo su 11 mesi diviso 12, cioè il canone
// medio mensile "vero" dopo la chiusura aziendale. Es.: 100 €/mese → 1.100 €
// l'anno → 91,67 € al mese. L'una tantum non ha un mese: vale 0.
export function computeMeseRiparametrato(
  serviceType: ServiceType,
  prezzoVenduto: number
): number {
  return serviceType === "ONE_SHOT" ? 0 : (prezzoVenduto * MESI_ANNUO) / 12;
}

export function computeDiscountPct(
  listPrice: number,
  prezzoVenduto: number
): number | null {
  if (listPrice === 0) return null;
  return (listPrice - prezzoVenduto) / listPrice;
}
