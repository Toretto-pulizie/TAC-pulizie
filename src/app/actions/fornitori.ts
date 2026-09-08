"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/dal";

const FornitoreSchema = z.object({
  name: z.string().trim().min(1, "Nome richiesto"),
  partitaIva: z.string().trim().optional(),
  codiceFiscale: z.string().trim().optional(),
  indirizzo: z.string().trim().optional(),
  telefono: z.string().trim().optional(),
  email: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

function emptyToNull(v: string | undefined) {
  return v && v.length > 0 ? v : null;
}

export async function createFornitore(_prevState: unknown, formData: FormData) {
  await requireModule("fornitori");

  const parsed = FornitoreSchema.safeParse({
    name: formData.get("name"),
    partitaIva: formData.get("partitaIva") || undefined,
    codiceFiscale: formData.get("codiceFiscale") || undefined,
    indirizzo: formData.get("indirizzo") || undefined,
    telefono: formData.get("telefono") || undefined,
    email: formData.get("email") || undefined,
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const { name, partitaIva, codiceFiscale, indirizzo, telefono, email, note } =
    parsed.data;
  await prisma.fornitore.create({
    data: {
      name,
      partitaIva: emptyToNull(partitaIva),
      codiceFiscale: emptyToNull(codiceFiscale),
      indirizzo: emptyToNull(indirizzo),
      telefono: emptyToNull(telefono),
      email: emptyToNull(email),
      note: emptyToNull(note),
    },
  });

  revalidatePath("/admin/fornitori");
  return { success: true };
}

const UpdateFornitoreSchema = FornitoreSchema.extend({
  id: z.string().min(1),
});

export async function updateFornitore(_prevState: unknown, formData: FormData) {
  await requireModule("fornitori");

  const parsed = UpdateFornitoreSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    partitaIva: formData.get("partitaIva") || undefined,
    codiceFiscale: formData.get("codiceFiscale") || undefined,
    indirizzo: formData.get("indirizzo") || undefined,
    telefono: formData.get("telefono") || undefined,
    email: formData.get("email") || undefined,
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const { id, name, partitaIva, codiceFiscale, indirizzo, telefono, email, note } =
    parsed.data;
  await prisma.fornitore.update({
    where: { id },
    data: {
      name,
      partitaIva: emptyToNull(partitaIva),
      codiceFiscale: emptyToNull(codiceFiscale),
      indirizzo: emptyToNull(indirizzo),
      telefono: emptyToNull(telefono),
      email: emptyToNull(email),
      note: emptyToNull(note),
    },
  });

  revalidatePath("/admin/fornitori");
  redirect("/admin/fornitori");
}

export async function deleteFornitore(id: string) {
  await requireModule("fornitori");
  await prisma.fornitore.delete({ where: { id } });
  revalidatePath("/admin/fornitori");
}
