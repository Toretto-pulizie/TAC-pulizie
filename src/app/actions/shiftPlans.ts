"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/dal";
import { generateShiftsForPlan } from "@/lib/shiftPlanGenerator";

const ShiftPlanSchema = z
  .object({
    userId: z.string().min(1, "Seleziona un collaboratore"),
    siteId: z.string().min(1, "Seleziona un cliente/cantiere"),
    quoteSiteId: z.string().trim().optional(),
    daysOfWeek: z.array(z.coerce.number().min(0).max(6)).min(1, "Seleziona almeno un giorno"),
    intervalWeeks: z.coerce.number().min(1, "Minimo 1 settimana").max(12),
    startTime: z.string().min(1, "Ora inizio richiesta"),
    endTime: z.string().min(1, "Ora fine richiesta"),
    dataInizio: z.string().min(1, "Data inizio richiesta"),
    dataFine: z.string().optional(),
    note: z.string().trim().optional(),
  })
  .refine((d) => d.endTime > d.startTime, {
    message: "L'orario di fine deve essere dopo l'inizio",
  })
  .refine((d) => !d.dataFine || d.dataFine >= d.dataInizio, {
    message: "La data fine deve essere dopo la data inizio",
  });

export async function createShiftPlan(_prevState: unknown, formData: FormData) {
  await requireModule("pianificazione");

  const parsed = ShiftPlanSchema.safeParse({
    userId: formData.get("userId"),
    siteId: formData.get("siteId"),
    quoteSiteId: formData.get("quoteSiteId") || undefined,
    daysOfWeek: formData.getAll("daysOfWeek"),
    intervalWeeks: formData.get("intervalWeeks") || 1,
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    dataInizio: formData.get("dataInizio"),
    dataFine: formData.get("dataFine") || undefined,
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const d = parsed.data;

  const plan = await prisma.shiftPlan.create({
    data: {
      userId: d.userId,
      siteId: d.siteId,
      quoteSiteId: d.quoteSiteId || null,
      daysOfWeek: d.daysOfWeek,
      intervalWeeks: d.intervalWeeks,
      startTime: d.startTime,
      endTime: d.endTime,
      dataInizio: new Date(`${d.dataInizio}T00:00:00`),
      dataFine: d.dataFine ? new Date(`${d.dataFine}T00:00:00`) : null,
      note: d.note || null,
    },
  });

  await generateShiftsForPlan(plan);

  revalidatePath("/admin/pianificazione");
  revalidatePath("/dipendente");
  return { success: true };
}

export async function deleteShiftPlan(id: string) {
  await requireModule("pianificazione");

  // I turni già passati restano come storico (diventano turni "normali",
  // senza più un piano collegato); i turni futuri non ancora svolti vengono
  // rimossi insieme al piano che li aveva generati.
  await prisma.shift.deleteMany({
    where: { planId: id, start: { gt: new Date() } },
  });
  await prisma.shiftPlan.delete({ where: { id } });

  revalidatePath("/admin/pianificazione");
  revalidatePath("/dipendente");
}
