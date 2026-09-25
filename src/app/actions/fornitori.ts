"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/dal";
import { lookupPartitaIva } from "@/lib/viesLookup";
import { lookupCapFromAddress } from "@/lib/geocode";

const FornitoreSchema = z.object({
  name: z.string().trim().min(1, "Nome richiesto"),
  partitaIva: z.string().trim().optional(),
  codiceFiscale: z.string().trim().optional(),
  indirizzo: z.string().trim().optional(),
  cap: z.string().trim().optional(),
  citta: z.string().trim().optional(),
  provincia: z.string().trim().optional(),
  telefono: z.string().trim().optional(),
  email: z.string().trim().optional(),
  pec: z.string().trim().optional(),
  codiceUnivoco: z.string().trim().optional(),
  agenteNome: z.string().trim().optional(),
  agenteCognome: z.string().trim().optional(),
  agenteTelefono: z.string().trim().optional(),
  agenteEmail: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

// Stessa ricerca VIES già usata in Clienti (src/app/actions/admin.ts), qui
// con il gate sul modulo Fornitori invece che Clienti.
export async function checkPartitaIvaFornitore(piva: string) {
  await requireModule("fornitori");
  const result = await lookupPartitaIva(piva);
  if (!result) {
    return { error: "Partita IVA non trovata o non attiva (verifica VIES)" };
  }
  return { success: true as const, data: result };
}

export async function findCapFromAddressFornitore(address: string) {
  await requireModule("fornitori");
  if (!address.trim()) return { error: "Indirizzo vuoto" };
  const result = await lookupCapFromAddress(address);
  if (!result) {
    return { error: "CAP non trovato per questo indirizzo" };
  }
  return { success: true as const, data: result };
}

function emptyToNull(v: string | undefined) {
  return v && v.length > 0 ? v : null;
}

async function findDuplicateFornitore(
  partitaIva: string | undefined,
  codiceFiscale: string | undefined,
  excludeId?: string
) {
  if (!partitaIva && !codiceFiscale) return null;
  return prisma.fornitore.findFirst({
    where: {
      ...(excludeId ? { id: { not: excludeId } } : {}),
      OR: [
        ...(partitaIva ? [{ partitaIva }] : []),
        ...(codiceFiscale ? [{ codiceFiscale }] : []),
      ],
    },
  });
}

export async function createFornitore(_prevState: unknown, formData: FormData) {
  await requireModule("fornitori");

  const parsed = FornitoreSchema.safeParse({
    name: formData.get("name"),
    partitaIva: formData.get("partitaIva") || undefined,
    codiceFiscale: formData.get("codiceFiscale") || undefined,
    indirizzo: formData.get("indirizzo") || undefined,
    cap: formData.get("cap") || undefined,
    citta: formData.get("citta") || undefined,
    provincia: formData.get("provincia") || undefined,
    telefono: formData.get("telefono") || undefined,
    email: formData.get("email") || undefined,
    pec: formData.get("pec") || undefined,
    codiceUnivoco: formData.get("codiceUnivoco") || undefined,
    agenteNome: formData.get("agenteNome") || undefined,
    agenteCognome: formData.get("agenteCognome") || undefined,
    agenteTelefono: formData.get("agenteTelefono") || undefined,
    agenteEmail: formData.get("agenteEmail") || undefined,
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const {
    name,
    partitaIva,
    codiceFiscale,
    indirizzo,
    cap,
    citta,
    provincia,
    telefono,
    email,
    pec,
    codiceUnivoco,
    agenteNome,
    agenteCognome,
    agenteTelefono,
    agenteEmail,
    note,
  } = parsed.data;

  const duplicate = await findDuplicateFornitore(partitaIva, codiceFiscale);
  if (duplicate) {
    return {
      error: `Esiste già un fornitore con questa P. IVA o codice fiscale: ${duplicate.name}`,
    };
  }

  await prisma.fornitore.create({
    data: {
      name,
      partitaIva: emptyToNull(partitaIva),
      codiceFiscale: emptyToNull(codiceFiscale),
      indirizzo: emptyToNull(indirizzo),
      cap: emptyToNull(cap),
      citta: emptyToNull(citta),
      provincia: emptyToNull(provincia),
      telefono: emptyToNull(telefono),
      email: emptyToNull(email),
      pec: emptyToNull(pec),
      codiceUnivoco: emptyToNull(codiceUnivoco),
      agenteNome: emptyToNull(agenteNome),
      agenteCognome: emptyToNull(agenteCognome),
      agenteTelefono: emptyToNull(agenteTelefono),
      agenteEmail: emptyToNull(agenteEmail),
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
    cap: formData.get("cap") || undefined,
    citta: formData.get("citta") || undefined,
    provincia: formData.get("provincia") || undefined,
    telefono: formData.get("telefono") || undefined,
    email: formData.get("email") || undefined,
    pec: formData.get("pec") || undefined,
    codiceUnivoco: formData.get("codiceUnivoco") || undefined,
    agenteNome: formData.get("agenteNome") || undefined,
    agenteCognome: formData.get("agenteCognome") || undefined,
    agenteTelefono: formData.get("agenteTelefono") || undefined,
    agenteEmail: formData.get("agenteEmail") || undefined,
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const {
    id,
    name,
    partitaIva,
    codiceFiscale,
    indirizzo,
    cap,
    citta,
    provincia,
    telefono,
    email,
    pec,
    codiceUnivoco,
    agenteNome,
    agenteCognome,
    agenteTelefono,
    agenteEmail,
    note,
  } = parsed.data;

  const duplicate = await findDuplicateFornitore(partitaIva, codiceFiscale, id);
  if (duplicate) {
    return {
      error: `Esiste già un fornitore con questa P. IVA o codice fiscale: ${duplicate.name}`,
    };
  }

  await prisma.fornitore.update({
    where: { id },
    data: {
      name,
      partitaIva: emptyToNull(partitaIva),
      codiceFiscale: emptyToNull(codiceFiscale),
      indirizzo: emptyToNull(indirizzo),
      cap: emptyToNull(cap),
      citta: emptyToNull(citta),
      provincia: emptyToNull(provincia),
      telefono: emptyToNull(telefono),
      email: emptyToNull(email),
      pec: emptyToNull(pec),
      codiceUnivoco: emptyToNull(codiceUnivoco),
      agenteNome: emptyToNull(agenteNome),
      agenteCognome: emptyToNull(agenteCognome),
      agenteTelefono: emptyToNull(agenteTelefono),
      agenteEmail: emptyToNull(agenteEmail),
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
