"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/dal";

const QuoteSchema = z.object({
  siteId: z.string().min(1, "Seleziona un cliente/cantiere"),
  serviceType: z.enum(["ONE_SHOT", "PASS_SETTIMANALE", "PASS_MENSILE"]),
  ore: z.coerce.number().min(0, "Ore non valide"),
  spostamento: z.coerce.number().min(0).default(0),
  oneShotCount: z.coerce.number().min(0).default(1),
  passSettimanale: z.coerce.number().min(0).optional(),
  passMensile: z.coerce.number().min(0).optional(),
  oreVetri: z.coerce.number().min(0).default(0),
  passVetriAnno: z.coerce.number().min(0).default(0),
  tariffaOraria: z.coerce.number().min(0),
  tariffaVetri: z.coerce.number().min(0),
  tariffaConsuntivo: z.coerce.number().min(0),
  prezzoVenduto: z.coerce.number().min(0).optional(),
  note: z.string().trim().optional(),
});

export async function createQuote(_prevState: unknown, formData: FormData) {
  await requireAdmin();

  const parsed = QuoteSchema.safeParse({
    siteId: formData.get("siteId"),
    serviceType: formData.get("serviceType"),
    ore: formData.get("ore"),
    spostamento: formData.get("spostamento") || 0,
    oneShotCount: formData.get("oneShotCount") || 1,
    passSettimanale: formData.get("passSettimanale") || undefined,
    passMensile: formData.get("passMensile") || undefined,
    oreVetri: formData.get("oreVetri") || 0,
    passVetriAnno: formData.get("passVetriAnno") || 0,
    tariffaOraria: formData.get("tariffaOraria"),
    tariffaVetri: formData.get("tariffaVetri"),
    tariffaConsuntivo: formData.get("tariffaConsuntivo"),
    prezzoVenduto: formData.get("prezzoVenduto") || undefined,
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const { note, ...data } = parsed.data;

  await prisma.quote.create({ data: { ...data, note: note || null } });

  revalidatePath("/admin/preventivi");
  revalidatePath("/admin/consuntivi");
  return { success: true };
}

export async function setQuoteStatus(
  id: string,
  status: "IN_TRATTATIVA" | "ACCETTATO" | "RIFIUTATO"
) {
  await requireAdmin();

  await prisma.quote.update({
    where: { id },
    data: {
      status,
      closedAt: status === "IN_TRATTATIVA" ? null : new Date(),
    },
  });

  revalidatePath("/admin/preventivi");
  revalidatePath("/admin/consuntivi");
}

export async function deleteQuote(id: string) {
  await requireAdmin();
  await prisma.quote.delete({ where: { id } });
  revalidatePath("/admin/preventivi");
  revalidatePath("/admin/consuntivi");
}
