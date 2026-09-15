"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession, requireModule } from "@/lib/dal";
import { notifyAdmins, notifyUser } from "@/lib/notifications";
import { TIPO_LABELS } from "@/lib/leaveRequests";

const LeaveRequestSchema = z
  .object({
    tipo: z.enum([
      "INFORTUNIO",
      "MALATTIA",
      "PERMESSO",
      "PERMESSO_RETRIBUITO",
      "LEGGE_104",
      "FERIE_RICHIESTE",
      "FERIE_AZIENDALI",
      "MATERNITA_ANTICIPATA",
      "MATERNITA_FACOLTATIVA",
    ]),
    dataInizio: z.string().min(1, "Seleziona la data di inizio"),
    dataFine: z.string().min(1, "Seleziona la data di fine"),
    note: z.string().trim().optional(),
  })
  .refine((data) => new Date(data.dataFine) >= new Date(data.dataInizio), {
    message: "La data di fine deve essere uguale o successiva a quella di inizio.",
  });

export async function createLeaveRequest(_prevState: unknown, formData: FormData) {
  const session = await verifySession();

  const parsed = LeaveRequestSchema.safeParse({
    tipo: formData.get("tipo"),
    dataInizio: formData.get("dataInizio"),
    dataFine: formData.get("dataFine"),
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const { tipo, dataInizio, dataFine, note } = parsed.data;

  await prisma.leaveRequest.create({
    data: {
      userId: session.userId,
      tipo,
      dataInizio: new Date(dataInizio),
      dataFine: new Date(dataFine),
      note: note || null,
    },
  });

  await notifyAdmins(
    `${session.name} ha richiesto: ${TIPO_LABELS[tipo]}`,
    "/admin/permessi"
  );

  revalidatePath("/dipendente/permessi");
  revalidatePath("/admin/permessi");
  return { success: true };
}

const AdminLeaveRequestSchema = z
  .object({
    userId: z.string().min(1, "Seleziona un collaboratore"),
    tipo: z.enum([
      "INFORTUNIO",
      "MALATTIA",
      "PERMESSO",
      "PERMESSO_RETRIBUITO",
      "LEGGE_104",
      "FERIE_RICHIESTE",
      "FERIE_AZIENDALI",
      "MATERNITA_ANTICIPATA",
      "MATERNITA_FACOLTATIVA",
    ]),
    dataInizio: z.string().min(1, "Seleziona la data di inizio"),
    dataFine: z.string().min(1, "Seleziona la data di fine"),
    note: z.string().trim().optional(),
  })
  .refine((data) => new Date(data.dataFine) >= new Date(data.dataInizio), {
    message: "La data di fine deve essere uguale o successiva a quella di inizio.",
  });

// Inserimento diretto da parte dell'Amministratore: per assenze che il
// collaboratore si è dimenticato di registrare, o per quelle decise
// dall'azienda (es. Ferie aziendali) che non sono affatto una richiesta del
// collaboratore. Entra già come Approvata, non "in attesa": chi la inserisce
// è lo stesso amministratore che altrimenti dovrebbe approvarla. "Tutti i
// collaboratori" applica la stessa assenza a ogni Collaboratore attivo in un
// colpo solo (utile per una chiusura aziendale).
export async function createLeaveRequestAdmin(_prevState: unknown, formData: FormData) {
  await requireModule("permessi");

  const parsed = AdminLeaveRequestSchema.safeParse({
    userId: formData.get("userId"),
    tipo: formData.get("tipo"),
    dataInizio: formData.get("dataInizio"),
    dataFine: formData.get("dataFine"),
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const { userId, tipo, dataInizio, dataFine, note } = parsed.data;

  const targetUserIds =
    userId === "ALL"
      ? (
          await prisma.user.findMany({
            where: { active: true, role: "EMPLOYEE" },
            select: { id: true },
          })
        ).map((u) => u.id)
      : [userId];

  if (targetUserIds.length === 0) {
    return { error: "Nessun collaboratore attivo trovato" };
  }

  await prisma.leaveRequest.createMany({
    data: targetUserIds.map((uid) => ({
      userId: uid,
      tipo,
      dataInizio: new Date(dataInizio),
      dataFine: new Date(dataFine),
      note: note || null,
      stato: "APPROVATO" as const,
      decisoAt: new Date(),
    })),
  });

  for (const uid of targetUserIds) {
    await notifyUser(uid, `Registrata assenza: ${TIPO_LABELS[tipo]}`, "/dipendente/permessi");
  }

  revalidatePath("/admin/permessi");
  revalidatePath("/admin/presenze");
  revalidatePath("/dipendente/permessi");
  return { success: true };
}

export async function setLeaveRequestStatus(
  id: string,
  stato: "APPROVATO" | "RIFIUTATO" | "IN_ATTESA"
) {
  await requireModule("permessi");

  const request = await prisma.leaveRequest.update({
    where: { id },
    data: { stato, decisoAt: stato === "IN_ATTESA" ? null : new Date() },
  });

  if (stato === "APPROVATO" || stato === "RIFIUTATO") {
    await notifyUser(
      request.userId,
      `Richiesta di ${TIPO_LABELS[request.tipo]} ${
        stato === "APPROVATO" ? "approvata" : "rifiutata"
      }`,
      "/dipendente/permessi"
    );
  }

  revalidatePath("/admin/permessi");
  revalidatePath("/admin/presenze");
  revalidatePath("/dipendente/permessi");
}

export async function deleteLeaveRequest(id: string) {
  const session = await verifySession();

  const request = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!request) return;
  if (request.userId !== session.userId && session.role !== "ADMIN") {
    return;
  }

  await prisma.leaveRequest.delete({ where: { id } });

  revalidatePath("/dipendente/permessi");
  revalidatePath("/admin/permessi");
}
