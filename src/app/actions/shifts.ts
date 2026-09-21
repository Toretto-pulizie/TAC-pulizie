"use server";

import { randomUUID } from "node:crypto";
import * as z from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/dal";
import { detectShiftConflicts } from "@/lib/shiftConflicts";

const BaseFieldsSchema = z.object({
  siteId: z.string().min(1, "Seleziona un cliente/cantiere"),
  date: z.string().min(1, "Seleziona una data"),
  startTime: z.string().min(1, "Ora inizio richiesta"),
  endTime: z.string().min(1, "Ora fine richiesta"),
  notes: z.string().trim().optional(),
});

function parseBaseFields(formData: FormData) {
  const parsed = BaseFieldsSchema.safeParse({
    siteId: formData.get("siteId"),
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" } as const;
  }
  const { siteId, date, startTime, endTime, notes } = parsed.data;
  const start = new Date(`${date}T${startTime}:00`);
  const end = new Date(`${date}T${endTime}:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { error: "Data o orario non validi." } as const;
  }
  if (end <= start) {
    return { error: "L'orario di fine deve essere dopo l'inizio." } as const;
  }
  return { siteId, start, end, notes: notes || null } as const;
}

// Crea un turno per uno o più collaboratori insieme sullo stesso cantiere,
// stessa data/orario (la suddivisione automatica del tempo tra più
// collaboratori è calcolata lato client in ShiftForm: qui si riceve già
// l'orario finale). Una riga Shift per collaboratore, tutte legate dallo
// stesso groupId: in calendario compaiono come un unico blocco.
export async function createShift(_prevState: unknown, formData: FormData) {
  await requireModule("pianificazione");

  const userIds = formData
    .getAll("userIds")
    .filter((v): v is string => typeof v === "string" && v.length > 0);
  if (userIds.length === 0) {
    return { error: "Seleziona almeno un collaboratore" };
  }

  const fields = parseBaseFields(formData);
  if ("error" in fields) return fields;

  const groupId = randomUUID();
  await prisma.shift.createMany({
    data: userIds.map((userId) => ({ userId, groupId, ...fields, pinned: true })),
  });

  revalidatePath("/admin/pianificazione");
  revalidatePath("/dipendente");
  return { success: true };
}

// Modifica un turno di gruppo esistente: può cambiare sede/data/orario/note
// e anche l'insieme dei collaboratori coinvolti (aggiungendone o
// togliendone) — le righe rimosse vengono eliminate, quelle mantenute
// aggiornate, quelle nuove create con lo stesso groupId.
export async function updateShiftGroup(_prevState: unknown, formData: FormData) {
  await requireModule("pianificazione");

  const groupId = formData.get("groupId");
  if (typeof groupId !== "string" || !groupId) {
    return { error: "Turno non valido." };
  }

  const userIds = formData
    .getAll("userIds")
    .filter((v): v is string => typeof v === "string" && v.length > 0);
  if (userIds.length === 0) {
    return { error: "Seleziona almeno un collaboratore" };
  }

  const fields = parseBaseFields(formData);
  if ("error" in fields) return fields;

  const existing = await prisma.shift.findMany({
    where: { groupId },
    select: { id: true, userId: true },
  });
  const existingUserIds = new Set(existing.map((s) => s.userId));
  const newUserIds = new Set(userIds);

  const toRemoveIds = existing.filter((s) => !newUserIds.has(s.userId)).map((s) => s.id);
  const toKeepIds = existing.filter((s) => newUserIds.has(s.userId)).map((s) => s.id);
  const toAddUserIds = userIds.filter((id) => !existingUserIds.has(id));

  await prisma.$transaction([
    ...(toRemoveIds.length
      ? [prisma.shift.deleteMany({ where: { id: { in: toRemoveIds } } })]
      : []),
    ...(toKeepIds.length
      ? [
          prisma.shift.updateMany({
            where: { id: { in: toKeepIds } },
            data: { ...fields, pinned: true },
          }),
        ]
      : []),
    ...(toAddUserIds.length
      ? [
          prisma.shift.createMany({
            data: toAddUserIds.map((userId) => ({ userId, groupId, ...fields, pinned: true })),
          }),
        ]
      : []),
  ]);

  revalidatePath("/admin/pianificazione");
  revalidatePath("/dipendente");
  return { success: true };
}

// Sposta un turno di gruppo trascinandolo nel calendario (cambia solo
// data/orario per tutti i collaboratori coinvolti insieme — per cambiare
// sede o collaboratori si apre la modifica).
export async function moveShift(input: { groupId: string; start: string; end: string }) {
  await requireModule("pianificazione");

  const start = new Date(input.start);
  const end = new Date(input.end);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return { error: "Orario non valido." };
  }

  await prisma.shift.updateMany({
    where: { groupId: input.groupId },
    data: { start, end, pinned: true },
  });

  revalidatePath("/admin/pianificazione");
  revalidatePath("/dipendente");
  return { success: true as const };
}

// Calcola gli avvisi (sovrapposizioni, capienza, monte ore, distanza) senza
// scrivere nulla — usata dal form e dal drag&drop prima di confermare.
export async function checkShiftConflicts(input: {
  userIds: string[];
  siteId: string;
  start: string;
  end: string;
  excludeShiftIds?: string[];
}) {
  await requireModule("pianificazione");
  return detectShiftConflicts({
    userIds: input.userIds,
    siteId: input.siteId,
    start: new Date(input.start),
    end: new Date(input.end),
    excludeShiftIds: input.excludeShiftIds,
  });
}

export async function deleteShiftGroup(groupId: string) {
  await requireModule("pianificazione");
  await prisma.shift.deleteMany({ where: { groupId } });
  revalidatePath("/admin/pianificazione");
  revalidatePath("/dipendente");
}
