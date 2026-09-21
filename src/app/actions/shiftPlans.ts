"use server";

import { randomUUID } from "node:crypto";
import * as z from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/dal";
import { generateShiftsForPlan } from "@/lib/shiftPlanGenerator";

const ShiftPlanSchema = z
  .object({
    siteId: z.string().min(1, "Seleziona un cliente/cantiere"),
    quoteSiteId: z.string().trim().optional(),
    daysOfWeek: z.array(z.coerce.number().min(0).max(6)).min(1, "Seleziona almeno un giorno"),
    // Cadenza a settimane (esatta) oppure a giorni/mesi standard (usata per
    // "mensile"/"bimestrale" ecc., non slitta rispetto al calendario come
    // farebbe una stima a settimane) — sempre e solo una delle due.
    intervalWeeks: z.coerce.number().min(1).max(52).optional(),
    intervalDays: z.coerce.number().min(1).max(366).optional(),
    startTime: z.string().min(1, "Ora inizio richiesta"),
    endTime: z.string().min(1, "Ora fine richiesta"),
    dataInizio: z.string().min(1, "Data inizio richiesta"),
    dataFine: z.string().optional(),
    note: z.string().trim().optional(),
  })
  .refine((d) => d.intervalWeeks != null || d.intervalDays != null, {
    message: "Seleziona la cadenza",
  })
  .refine((d) => d.endTime > d.startTime, {
    message: "L'orario di fine deve essere dopo l'inizio",
  })
  .refine((d) => !d.dataFine || d.dataFine >= d.dataInizio, {
    message: "La data fine deve essere dopo la data inizio",
  });

// Crea un piano ricorrente per uno o più collaboratori insieme sullo stesso
// cantiere (una riga ShiftPlan per collaboratore, stessi giorni/orario/date
// — la suddivisione del tempo tra più collaboratori è già calcolata lato
// client in ShiftPlanForm, qui si riceve l'orario finale).
export async function createShiftPlan(_prevState: unknown, formData: FormData) {
  await requireModule("pianificazione");

  const userIds = formData
    .getAll("userIds")
    .filter((v): v is string => typeof v === "string" && v.length > 0);
  if (userIds.length === 0) {
    return { error: "Seleziona almeno un collaboratore" };
  }

  const parsed = ShiftPlanSchema.safeParse({
    siteId: formData.get("siteId"),
    quoteSiteId: formData.get("quoteSiteId") || undefined,
    daysOfWeek: formData.getAll("daysOfWeek"),
    intervalWeeks: formData.get("intervalWeeks") || undefined,
    intervalDays: formData.get("intervalDays") || undefined,
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
  // Condiviso da tutti i piani "fratelli" creati in questa stessa richiesta
  // (uno per collaboratore): i turni che generano finiranno così nello
  // stesso Shift.groupId, e compariranno in calendario come un unico blocco.
  const groupId = randomUUID();

  for (const userId of userIds) {
    const plan = await prisma.shiftPlan.create({
      data: {
        userId,
        siteId: d.siteId,
        quoteSiteId: d.quoteSiteId || null,
        daysOfWeek: d.daysOfWeek,
        intervalWeeks: d.intervalWeeks ?? 1,
        intervalDays: d.intervalDays ?? null,
        startTime: d.startTime,
        endTime: d.endTime,
        dataInizio: new Date(`${d.dataInizio}T00:00:00`),
        dataFine: d.dataFine ? new Date(`${d.dataFine}T00:00:00`) : null,
        note: d.note || null,
        groupId,
      },
    });
    await generateShiftsForPlan(plan);
  }

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
