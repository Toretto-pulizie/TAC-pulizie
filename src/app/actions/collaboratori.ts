"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/dal";

const CollaboratoreSchema = z.object({
  nome: z.string().trim().min(1, "Nome richiesto"),
  cognome: z.string().trim().optional(),
  codiceFiscale: z.string().trim().optional(),
  indirizzo: z.string().trim().optional(),
  telefono: z.string().trim().optional(),
  email: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

function emptyToNull(v: string | undefined) {
  return v && v.length > 0 ? v : null;
}

export async function createCollaboratore(
  _prevState: unknown,
  formData: FormData
) {
  await requireModule("collaboratori");

  const parsed = CollaboratoreSchema.safeParse({
    nome: formData.get("nome"),
    cognome: formData.get("cognome") || undefined,
    codiceFiscale: formData.get("codiceFiscale") || undefined,
    indirizzo: formData.get("indirizzo") || undefined,
    telefono: formData.get("telefono") || undefined,
    email: formData.get("email") || undefined,
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const { nome, cognome, codiceFiscale, indirizzo, telefono, email, note } =
    parsed.data;
  await prisma.collaboratore.create({
    data: {
      nome,
      cognome: emptyToNull(cognome),
      codiceFiscale: emptyToNull(codiceFiscale),
      indirizzo: emptyToNull(indirizzo),
      telefono: emptyToNull(telefono),
      email: emptyToNull(email),
      note: emptyToNull(note),
    },
  });

  revalidatePath("/admin/collaboratori");
  return { success: true };
}

const UpdateCollaboratoreSchema = CollaboratoreSchema.extend({
  id: z.string().min(1),
});

export async function updateCollaboratore(
  _prevState: unknown,
  formData: FormData
) {
  await requireModule("collaboratori");

  const parsed = UpdateCollaboratoreSchema.safeParse({
    id: formData.get("id"),
    nome: formData.get("nome"),
    cognome: formData.get("cognome") || undefined,
    codiceFiscale: formData.get("codiceFiscale") || undefined,
    indirizzo: formData.get("indirizzo") || undefined,
    telefono: formData.get("telefono") || undefined,
    email: formData.get("email") || undefined,
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const { id, nome, cognome, codiceFiscale, indirizzo, telefono, email, note } =
    parsed.data;
  await prisma.collaboratore.update({
    where: { id },
    data: {
      nome,
      cognome: emptyToNull(cognome),
      codiceFiscale: emptyToNull(codiceFiscale),
      indirizzo: emptyToNull(indirizzo),
      telefono: emptyToNull(telefono),
      email: emptyToNull(email),
      note: emptyToNull(note),
    },
  });

  revalidatePath("/admin/collaboratori");
  redirect("/admin/collaboratori");
}

export async function deleteCollaboratore(id: string) {
  await requireModule("collaboratori");
  await prisma.collaboratore.delete({ where: { id } });
  revalidatePath("/admin/collaboratori");
}
