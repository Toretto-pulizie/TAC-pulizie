import type { ServiceType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const DEFAULT_SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  ONE_SHOT: "Una tantum",
  PASS_SETTIMANALE: "Abbonamento settimanale",
  PASS_MENSILE: "Abbonamento mensile",
};

// Per sua natura "una tantum" non ha una cadenza da riepilogare; i passaggi
// settimanali/mensili sì. Sono solo i valori iniziali: modificabili da
// Impostazioni, per ogni tipo, anche per quelli aggiunti in futuro.
export const DEFAULT_MOSTRA_CADENZA: Record<ServiceType, boolean> = {
  ONE_SHOT: false,
  PASS_SETTIMANALE: true,
  PASS_MENSILE: true,
};

export async function getServiceTypeLabels(): Promise<Record<ServiceType, string>> {
  const rows = await prisma.serviceTypeLabel.findMany();
  const labels = { ...DEFAULT_SERVICE_TYPE_LABELS };
  for (const row of rows) {
    labels[row.tipo] = row.etichetta;
  }
  return labels;
}

// Nessuna abbreviazione di default: finché non viene impostata in
// Impostazioni, l'elenco Preventivi mostra l'etichetta per intero.
export async function getServiceTypeAbbreviazioni(): Promise<
  Record<ServiceType, string | null>
> {
  const rows = await prisma.serviceTypeLabel.findMany();
  const abbreviazioni: Record<ServiceType, string | null> = {
    ONE_SHOT: null,
    PASS_SETTIMANALE: null,
    PASS_MENSILE: null,
  };
  for (const row of rows) {
    abbreviazioni[row.tipo] = row.abbreviazione;
  }
  return abbreviazioni;
}

export async function getServiceTypeMostraCadenza(): Promise<
  Record<ServiceType, boolean>
> {
  const rows = await prisma.serviceTypeLabel.findMany();
  const settings = { ...DEFAULT_MOSTRA_CADENZA };
  for (const row of rows) {
    settings[row.tipo] = row.mostraCadenza;
  }
  return settings;
}
