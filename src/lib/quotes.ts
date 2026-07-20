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

export function computeSoldAnnual(
  serviceType: ServiceType,
  prezzoVenduto: number
): number {
  return serviceType === "ONE_SHOT" ? prezzoVenduto : prezzoVenduto * 12;
}

export function computeDiscountPct(
  listPrice: number,
  prezzoVenduto: number
): number | null {
  if (listPrice === 0) return null;
  return (listPrice - prezzoVenduto) / listPrice;
}
