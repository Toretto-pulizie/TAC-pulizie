"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/dal";

const ShiftSchema = z.object({
  userId: z.string().min(1, "Seleziona un dipendente"),
  siteId: z.string().min(1, "Seleziona un cliente/cantiere"),
  date: z.string().min(1, "Seleziona una data"),
  startTime: z.string().min(1, "Ora inizio richiesta"),
  endTime: z.string().min(1, "Ora fine richiesta"),
  notes: z.string().trim().optional(),
});

export async function createShift(_prevState: unknown, formData: FormData) {
  await requireAdmin();

  const parsed = ShiftSchema.safeParse({
    userId: formData.get("userId"),
    siteId: formData.get("siteId"),
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const { userId, siteId, date, startTime, endTime, notes } = parsed.data;
  const start = new Date(`${date}T${startTime}:00`);
  const end = new Date(`${date}T${endTime}:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { error: "Data o orario non validi." };
  }

  if (end <= start) {
    return { error: "L'orario di fine deve essere dopo l'inizio." };
  }

  await prisma.shift.create({
    data: { userId, siteId, start, end, notes: notes || null },
  });

  revalidatePath("/admin/pianificazione");
  revalidatePath("/dipendente");
  return { success: true };
}

export async function deleteShift(id: string) {
  await requireAdmin();
  await prisma.shift.delete({ where: { id } });
  revalidatePath("/admin/pianificazione");
  revalidatePath("/dipendente");
}
