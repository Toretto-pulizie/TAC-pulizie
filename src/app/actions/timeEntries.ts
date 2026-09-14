"use server";

import { randomUUID } from "crypto";
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

  // Ogni timbratura porta con sé l'id della sessione a cui appartiene, così
  // Inizio/Fine (ed eventuale Spostamento) restano legati anche se in
  // seguito finiscono per condividere lo stesso orario con un'altra
  // sessione (es. un inserimento manuale successivo). TRAVEL_START e
  // WORK_START aprono una nuova sessione, a meno che lo START non stia
  // chiudendo uno spostamento appena iniziato dallo stesso collaboratore
  // (in tal caso ne eredita l'id); WORK_END eredita sempre l'id dell'ultima
  // voce del collaboratore, che a quel punto dev'essere l'Inizio da chiudere.
  let sessionId: string = randomUUID();
  if (type === "WORK_START" || type === "WORK_END" || type === "SOPRALLUOGO_END") {
    const last = await prisma.timeEntry.findFirst({
      where: { userId: session.userId },
      orderBy: { timestamp: "desc" },
    });
    const isEndType = type === "WORK_END" || type === "SOPRALLUOGO_END";
    if (last && (isEndType || last.type === "TRAVEL_START") && last.sessionId) {
      sessionId = last.sessionId;
    }
  }

  await prisma.timeEntry.create({
    data: {
      userId: session.userId,
      siteId: siteId || null,
      type,
      lat: lat ?? null,
      lng: lng ?? null,
      sessionId,
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

function combineDate(dateStr: string, hhmm: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  return new Date(y, m - 1, d, h, mi, 0, 0);
}

// Modifica qualsiasi aspetto di una sessione già timbrata: Collaboratore,
// Sede, Data, orario di inizio/fine, spostamento e nota. La sessione è la
// coppia di TimeEntry WORK_START/WORK_END (più un eventuale TRAVEL_START per
// lo spostamento): se manca la WORK_END (sessione in corso) o il
// TRAVEL_START (nessuno spostamento registrato) e viene indicato un valore,
// li crea al volo invece di aggiornarli; se lo spostamento viene azzerato e
// un TRAVEL_START esisteva, lo elimina. Collaboratore/Sede/Data vanno sempre
// inviati (anche quando si sta modificando solo l'orario): rappresentano lo
// stato corrente della riga, non solo il campo appena toccato.
export async function updateSessionTime(input: {
  startId: string;
  endId: string | null;
  travelId: string | null;
  userId: string;
  siteId: string | null;
  date: string;
  startTime: string;
  endTime: string | null;
  travelMinutes: number;
  note: string;
  // Descrizione libera del luogo, per i Sopralluoghi senza un Cliente/Sede
  // in anagrafica.
  luogo?: string | null;
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

  if (startEntry.type !== "WORK_START" && startEntry.type !== "SOPRALLUOGO_START") {
    return { error: "Voce non valida" };
  }
  const endType: EntryType =
    startEntry.type === "SOPRALLUOGO_START" ? "SOPRALLUOGO_END" : "WORK_END";

  const newStart = combineDate(input.date, input.startTime);
  const newEnd = input.endTime ? combineDate(input.date, input.endTime) : null;
  if (newEnd && newEnd <= newStart) {
    return { error: "L'orario di fine deve essere dopo l'inizio" };
  }

  // Se questo Inizio non ha ancora un sessionId (dato storico precedente
  // all'introduzione del campo), gliene assegniamo uno adesso: da questo
  // momento in poi la sessione resta legata in modo esplicito, invece di
  // continuare a fare affidamento sull'abbinamento per orario.
  const sessionId = startEntry.sessionId ?? randomUUID();

  await prisma.timeEntry.update({
    where: { id: input.startId },
    data: {
      timestamp: newStart,
      userId: input.userId,
      siteId: input.siteId,
      note: input.note.trim() || null,
      luogo: input.luogo?.trim() || null,
      sessionId,
      ...(input.startTimeIsLiteral ? { orarioStimato: false } : {}),
    },
  });

  if (newEnd) {
    if (input.endId) {
      await prisma.timeEntry.update({
        where: { id: input.endId },
        data: {
          timestamp: newEnd,
          userId: input.userId,
          siteId: input.siteId,
          sessionId,
          ...(input.endTimeIsLiteral ? { orarioStimato: false } : {}),
        },
      });
    } else {
      await prisma.timeEntry.create({
        data: {
          userId: input.userId,
          siteId: input.siteId,
          type: endType,
          timestamp: newEnd,
          orarioStimato: !input.endTimeIsLiteral,
          sessionId,
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
        data: { timestamp: newTravelStart, userId: input.userId, siteId: input.siteId, sessionId },
      });
    } else {
      await prisma.timeEntry.create({
        data: {
          userId: input.userId,
          siteId: input.siteId,
          type: "TRAVEL_START",
          timestamp: newTravelStart,
          sessionId,
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

// Elimina un'intera sessione (Inizio/Fine/eventuale Spostamento).
export async function deleteSession(input: {
  startId: string;
  endId: string | null;
  travelId: string | null;
}) {
  await requireModule("timbrature");

  const ids = [input.startId, input.endId, input.travelId].filter(
    (id): id is string => id != null
  );
  await prisma.timeEntry.deleteMany({ where: { id: { in: ids } } });

  revalidatePath("/admin/timbrature");
  revalidatePath("/admin/consuntivi");
  revalidatePath("/admin/statistiche");
  return { success: true };
}

// Inserimento manuale di una sessione completa, per i casi in cui il
// collaboratore non abbia timbrato dall'app.
export async function createManualSession(input: {
  userId: string;
  // Facoltativo per il Sopralluogo: spesso fatto presso potenziali clienti
  // non ancora in anagrafica, in tal caso si usa "luogo" al suo posto.
  siteId: string | null;
  luogo?: string | null;
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
  // "LAVORO" (default) se assente: il Sopralluogo non ha spostamento
  // associato, essendo un'attività a sé.
  activityType?: "LAVORO" | "SOPRALLUOGO";
}) {
  await requireModule("timbrature");

  const isSopralluogo = input.activityType === "SOPRALLUOGO";
  if (!isSopralluogo && !input.siteId) {
    return { error: "Seleziona una sede" };
  }

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

  // Un unico sessionId per Spostamento/Inizio/Fine di questo inserimento:
  // così restano legati anche se un'altra sessione (per questo o un altro
  // collaboratore) finisce per avere lo stesso orario segnaposto.
  const sessionId = randomUUID();
  const startType: EntryType = isSopralluogo ? "SOPRALLUOGO_START" : "WORK_START";
  const endType: EntryType = isSopralluogo ? "SOPRALLUOGO_END" : "WORK_END";

  const data: {
    userId: string;
    siteId: string | null;
    type: EntryType;
    timestamp: Date;
    orarioStimato?: boolean;
    note?: string | null;
    luogo?: string | null;
    sessionId: string;
  }[] = [];

  if (!isSopralluogo && input.travelMinutes > 0) {
    data.push({
      userId: input.userId,
      siteId: input.siteId,
      type: "TRAVEL_START",
      timestamp: new Date(start.getTime() - input.travelMinutes * 60000),
      orarioStimato: !input.startTimeProvided,
      sessionId,
    });
  }
  data.push({
    userId: input.userId,
    siteId: input.siteId,
    type: startType,
    timestamp: start,
    orarioStimato: !input.startTimeProvided,
    note: input.note.trim() || null,
    luogo: input.luogo?.trim() || null,
    sessionId,
  });
  data.push({
    userId: input.userId,
    siteId: input.siteId,
    type: endType,
    timestamp: end,
    orarioStimato: !input.endTimeProvided,
    sessionId,
  });

  await prisma.timeEntry.createMany({ data });

  revalidatePath("/admin/timbrature");
  revalidatePath("/admin/consuntivi");
  revalidatePath("/admin/statistiche");
  return { success: true };
}
