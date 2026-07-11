"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession, requireAdmin } from "@/lib/dal";

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

  revalidatePath("/dipendente/permessi");
  revalidatePath("/admin/permessi");
  return { success: true };
}

export async function setLeaveRequestStatus(
  id: string,
  stato: "APPROVATO" | "RIFIUTATO" | "IN_ATTESA"
) {
  await requireAdmin();

  await prisma.leaveRequest.update({
    where: { id },
    data: { stato, decisoAt: stato === "IN_ATTESA" ? null : new Date() },
  });

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
