"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/dal";

const CondizionePagamentoSchema = z.object({
  etichetta: z.string().trim().min(1, "Il testo non può essere vuoto"),
});

export async function createCondizionePagamento(
  _prevState: unknown,
  formData: FormData
) {
  await requireModule("clienti");

  const parsed = CondizionePagamentoSchema.safeParse({
    etichetta: formData.get("etichetta"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  await prisma.condizionePagamento.create({
    data: { etichetta: parsed.data.etichetta },
  });
  revalidatePath("/admin/impostazioni");
  revalidatePath("/admin/clienti");
  revalidatePath("/admin/preventivi");
  return { success: true };
}

const UpdateCondizionePagamentoSchema = CondizionePagamentoSchema.extend({
  id: z.string().min(1),
});

export async function updateCondizionePagamento(
  _prevState: unknown,
  formData: FormData
) {
  await requireModule("clienti");

  const parsed = UpdateCondizionePagamentoSchema.safeParse({
    id: formData.get("id"),
    etichetta: formData.get("etichetta"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const { id, etichetta } = parsed.data;
  await prisma.condizionePagamento.update({
    where: { id },
    data: { etichetta },
  });

  revalidatePath("/admin/impostazioni");
  revalidatePath("/admin/clienti");
  revalidatePath("/admin/preventivi");
  return { success: true };
}

export async function deleteCondizionePagamento(id: string) {
  await requireModule("clienti");
  await prisma.condizionePagamento.delete({ where: { id } });
  revalidatePath("/admin/impostazioni");
  revalidatePath("/admin/clienti");
  revalidatePath("/admin/preventivi");
}
