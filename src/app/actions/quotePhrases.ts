"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/dal";

const PhraseSchema = z.object({
  categoria: z.string().trim().min(1, "Categoria richiesta"),
  titolo: z.string().trim().min(1, "Titolo richiesto"),
  testo: z.string().trim().min(1, "Testo richiesto"),
});

export async function createPhrase(_prevState: unknown, formData: FormData) {
  await requireAdmin();

  const parsed = PhraseSchema.safeParse({
    categoria: formData.get("categoria"),
    titolo: formData.get("titolo"),
    testo: formData.get("testo"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  await prisma.quotePhrase.create({ data: parsed.data });
  revalidatePath("/admin/preventivi/frasi");
  revalidatePath("/admin/preventivi");
  return { success: true };
}

const UpdatePhraseSchema = PhraseSchema.extend({
  id: z.string().min(1),
});

export async function updatePhrase(_prevState: unknown, formData: FormData) {
  await requireAdmin();

  const parsed = UpdatePhraseSchema.safeParse({
    id: formData.get("id"),
    categoria: formData.get("categoria"),
    titolo: formData.get("titolo"),
    testo: formData.get("testo"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const { id, ...data } = parsed.data;
  await prisma.quotePhrase.update({ where: { id }, data });

  revalidatePath("/admin/preventivi/frasi");
  revalidatePath("/admin/preventivi");
  redirect("/admin/preventivi/frasi");
}

export async function deletePhrase(id: string) {
  await requireAdmin();
  await prisma.quotePhrase.delete({ where: { id } });
  revalidatePath("/admin/preventivi/frasi");
  revalidatePath("/admin/preventivi");
}
