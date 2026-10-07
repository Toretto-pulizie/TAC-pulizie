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

// --- Modalità di canone (art. III delle clausole) ---------------------------
// Il canone su 11 mesi è il canone su 12 mesi moltiplicato per 12/11: stesso
// importo annuo, un mese all'anno non fatturato. Vale solo per i servizi
// continuativi; l'una tantum non cambia mai.
export const FATTORE_11_MESI = 12 / 11;

export type CanoneModalitaValue = "DODICI_MESI" | "UNDICI_MESI" | "ENTRAMBE";

export type CanoneInfo = {
  canoneModalita: CanoneModalitaValue;
  meseSenzaFattura: number | null;
};

// Importo fatturato per un mese (1-12), a partire dal canone su 12 mesi.
// Con ENTRAMBE (cliente non ancora deciso) vale come 12 mesi. Senza mese,
// importo del canone "pieno" di quella modalità.
export function canoneDelMese(
  base: number,
  serviceType: ServiceType,
  q: CanoneInfo,
  mese?: number
): number {
  if (serviceType === "ONE_SHOT" || q.canoneModalita !== "UNDICI_MESI") return base;
  if (mese != null && q.meseSenzaFattura === mese) return 0;
  return base * FATTORE_11_MESI;
}

// Lo stesso importo "pieno" usato per i totali del PDF: con `undici` si forza
// la lettura su 11 mesi (la riga alternativa del PDF), indipendentemente da
// come è stato salvato il preventivo.
export function canoneSu11Mesi(base: number, serviceType: ServiceType): number {
  return serviceType === "ONE_SHOT" ? base : base * FATTORE_11_MESI;
}
