"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession, requireModule } from "@/lib/dal";
import { startOfToday } from "@/lib/timeCalc";
import type { EntryType } from "@prisma/client";

export type PunchInput = {
  type: EntryType;
  siteId?: string;
  lat?: number;
  lng?: number;
};

export async function punch({ type, siteId, lat, lng }: PunchInput) {
  const session = await verifySession();

  await prisma.timeEntry.create({
    data: {
      userId: session.userId,
      siteId: siteId || null,
      type,
      lat: lat ?? null,
      lng: lng ?? null,
    },
  });

  revalidatePath("/dipendente");
  revalidatePath("/admin/timbrature");
}

export async function getTodayEntries(userId: string) {
  return prisma.timeEntry.findMany({
    where: { userId, timestamp: { gte: startOfToday() } },
    include: { site: { include: { client: true } } },
    orderBy: { timestamp: "asc" },
  });
}

function combineDateTime(original: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(original);
  d.setHours(h, m, 0, 0);
  return d;
}

// Modifica orario di inizio/fine, spostamento e nota di una sessione di
// lavoro già timbrata. La sessione è la coppia di TimeEntry
// WORK_START/WORK_END (più un eventuale TRAVEL_START per lo spostamento):
// se manca la WORK_END (sessione in corso) o il TRAVEL_START (nessuno
// spostamento registrato) e viene indicato un valore, li crea al volo
// invece di aggiornarli; se lo spostamento viene azzerato e un
// TRAVEL_START esisteva, lo elimina.
export async function updateSessionTime(input: {
  startId: string;
  endId: string | null;
  travelId: string | null;
  startTime: string;
  endTime: string | null;
  travelMinutes: number;
  note: string;
  // Vero solo quando l'utente ha scritto direttamente quell'orario (celle
  // Inizio/Fine), non quando deriva da un altro campo (es. Ore lavoro): solo
  // in quel caso l'orario smette di essere "stimato" (mostrato vuoto).
  startTimeIsLiteral?: boolean;
  endTimeIsLiteral?: boolean;
}) {
  await requireModule("timbrature");

  const startEntry = await prisma.timeEntry.findUniqueOrThrow({
    where: { id: input.startId },
  });

  if (startEntry.type !== "WORK_START") {
    return { error: "Voce non valida" };
  }

  const newStart = combineDateTime(startEntry.timestamp, input.startTime);
  const newEnd = input.endTime
    ? combineDateTime(startEntry.timestamp, input.endTime)
    : null;
  if (newEnd && newEnd <= newStart) {
    return { error: "L'orario di fine deve essere dopo l'inizio" };
  }

  await prisma.timeEntry.update({
    where: { id: input.startId },
    data: {
      timestamp: newStart,
      note: input.note.trim() || null,
      ...(input.startTimeIsLiteral ? { orarioStimato: false } : {}),
    },
  });

  if (newEnd) {
    if (input.endId) {
      await prisma.timeEntry.update({
        where: { id: input.endId },
        data: {
          timestamp: newEnd,
          ...(input.endTimeIsLiteral ? { orarioStimato: false } : {}),
        },
      });
    } else {
      await prisma.timeEntry.create({
        data: {
          userId: startEntry.userId,
          siteId: startEntry.siteId,
          type: "WORK_END",
          timestamp: newEnd,
          orarioStimato: !input.endTimeIsLiteral,
        },
      });
    }
  }

  const newTravelStart =
    input.travelMinutes > 0
      ? new Date(newStart.getTime() - input.travelMinutes * 60000)
      : null;
  if (newTravelStart) {
    if (input.travelId) {
      await prisma.timeEntry.update({
        where: { id: input.travelId },
        data: { timestamp: newTravelStart },
      });
    } else {
      await prisma.timeEntry.create({
        data: {
          userId: startEntry.userId,
          siteId: startEntry.siteId,
          type: "TRAVEL_START",
          timestamp: newTravelStart,
        },
      });
    }
  } else if (input.travelId) {
    await prisma.timeEntry.delete({ where: { id: input.travelId } });
  }

  revalidatePath("/admin/timbrature");
  revalidatePath("/admin/consuntivi");
  revalidatePath("/admin/statistiche");
  return { success: true };
}

// Inserimento manuale di una sessione completa, per i casi in cui il
// collaboratore non abbia timbrato dall'app.
export async function createManualSession(input: {
  userId: string;
  siteId: string;
  date: string;
  startTime: string;
  endTime: string;
  travelMinutes: number;
  note: string;
  // Vero solo se l'utente ha scritto letteralmente quell'orario (non se è
  // stato dedotto dalle sole Ore lavorate): in tal caso resta "stimato" e va
  // mostrato vuoto in griglia finché non viene impostato esplicitamente.
  startTimeProvided: boolean;
  endTimeProvided: boolean;
}) {
  await requireModule("timbrature");

  const [y, m, d] = input.date.split("-").map(Number);
  const [sh, sm] = input.startTime.split(":").map(Number);
  const [eh, em] = input.endTime.split(":").map(Number);
  if (
    !y || !m || !d ||
    Number.isNaN(sh) || Number.isNaN(sm) ||
    Number.isNaN(eh) || Number.isNaN(em)
  ) {
    return { error: "Dati non validi" };
  }

  const start = new Date(y, m - 1, d, sh, sm, 0, 0);
  const end = new Date(y, m - 1, d, eh, em, 0, 0);
  if (end <= start) {
    return { error: "L'orario di fine deve essere dopo l'inizio" };
  }

  const data: {
    userId: string;
    siteId: string;
    type: EntryType;
    timestamp: Date;
    orarioStimato?: boolean;
    note?: string | null;
  }[] = [];

  if (input.travelMinutes > 0) {
    data.push({
      userId: input.userId,
      siteId: input.siteId,
      type: "TRAVEL_START",
      timestamp: new Date(start.getTime() - input.travelMinutes * 60000),
      orarioStimato: !input.startTimeProvided,
    });
  }
  data.push({
    userId: input.userId,
    siteId: input.siteId,
    type: "WORK_START",
    timestamp: start,
    orarioStimato: !input.startTimeProvided,
    note: input.note.trim() || null,
  });
  data.push({
    userId: input.userId,
    siteId: input.siteId,
    type: "WORK_END",
    timestamp: end,
    orarioStimato: !input.endTimeProvided,
  });

  await prisma.timeEntry.createMany({ data });

  revalidatePath("/admin/timbrature");
  revalidatePath("/admin/consuntivi");
  revalidatePath("/admin/statistiche");
  return { success: true };
}
