import type { ServiceType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const DEFAULT_SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  ONE_SHOT: "Una tantum",
  PASS_SETTIMANALE: "Abbonamento settimanale",
  PASS_MENSILE: "Abbonamento mensile",
};

export async function getServiceTypeLabels(): Promise<Record<ServiceType, string>> {
  const rows = await prisma.serviceTypeLabel.findMany();
  const labels = { ...DEFAULT_SERVICE_TYPE_LABELS };
  for (const row of rows) {
    labels[row.tipo] = row.etichetta;
  }
  return labels;
}
