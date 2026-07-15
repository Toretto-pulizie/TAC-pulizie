"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/dal";

const ServiceTypeLabelSchema = z.object({
  tipo: z.enum(["ONE_SHOT", "PASS_SETTIMANALE", "PASS_MENSILE"]),
  etichetta: z.string().trim().min(1, "Il nome non può essere vuoto"),
});

export async function updateServiceTypeLabel(
  _prevState: unknown,
  formData: FormData
) {
  await requireAdmin();

  const parsed = ServiceTypeLabelSchema.safeParse({
    tipo: formData.get("tipo"),
    etichetta: formData.get("etichetta"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  await prisma.serviceTypeLabel.upsert({
    where: { tipo: parsed.data.tipo },
    update: { etichetta: parsed.data.etichetta },
    create: parsed.data,
  });

  revalidatePath("/admin/impostazioni");
  revalidatePath("/admin/preventivi");
  return { success: true };
}
