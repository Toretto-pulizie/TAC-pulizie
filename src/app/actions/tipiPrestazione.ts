"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/dal";

const TipoPrestazioneSchema = z.object({
  etichetta: z.string().trim().min(1, "Il testo non può essere vuoto"),
});

export async function createTipoPrestazione(
  _prevState: unknown,
  formData: FormData
) {
  await requireAdmin();

  const parsed = TipoPrestazioneSchema.safeParse({
    etichetta: formData.get("etichetta"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  await prisma.tipoPrestazione.create({ data: parsed.data });
  revalidatePath("/admin/impostazioni");
  revalidatePath("/admin/preventivi");
  return { success: true };
}

const UpdateTipoPrestazioneSchema = TipoPrestazioneSchema.extend({
  id: z.string().min(1),
});

export async function updateTipoPrestazione(
  _prevState: unknown,
  formData: FormData
) {
  await requireAdmin();

  const parsed = UpdateTipoPrestazioneSchema.safeParse({
    id: formData.get("id"),
    etichetta: formData.get("etichetta"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const { id, etichetta } = parsed.data;
  await prisma.tipoPrestazione.update({ where: { id }, data: { etichetta } });

  revalidatePath("/admin/impostazioni");
  revalidatePath("/admin/preventivi");
  return { success: true };
}

export async function deleteTipoPrestazione(id: string) {
  await requireAdmin();
  await prisma.tipoPrestazione.delete({ where: { id } });
  revalidatePath("/admin/impostazioni");
  revalidatePath("/admin/preventivi");
}
