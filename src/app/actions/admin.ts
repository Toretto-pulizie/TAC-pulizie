"use server";

import * as z from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/dal";
import { geocodeAddress } from "@/lib/geocode";

const EmployeeSchema = z.object({
  name: z.string().trim().min(2, "Nome troppo corto"),
  cognome: z.string().trim().optional(),
  telefono: z.string().trim().optional(),
  email: z.string().trim().email("Email non valida"),
  password: z.string().min(6, "Almeno 6 caratteri"),
  role: z.enum(["ADMIN", "EMPLOYEE"]),
});

export async function createEmployee(_prevState: unknown, formData: FormData) {
  await requireAdmin();

  const parsed = EmployeeSchema.safeParse({
    name: formData.get("name"),
    cognome: formData.get("cognome") || undefined,
    telefono: formData.get("telefono") || undefined,
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const { name, cognome, telefono, email, password, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Esiste già un utente con questa email." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      name,
      cognome: cognome || null,
      telefono: telefono || null,
      email,
      passwordHash,
      role,
    },
  });

  revalidatePath("/admin/dipendenti");
  return { success: true };
}

const UpdateEmployeeSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2, "Nome troppo corto"),
  cognome: z.string().trim().optional(),
  telefono: z.string().trim().optional(),
  email: z.string().trim().email("Email non valida"),
  role: z.enum(["ADMIN", "EMPLOYEE"]),
  password: z.union([z.string().min(6, "Almeno 6 caratteri"), z.literal("")]),
});

export async function updateEmployee(_prevState: unknown, formData: FormData) {
  await requireAdmin();

  const parsed = UpdateEmployeeSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    cognome: formData.get("cognome") || undefined,
    telefono: formData.get("telefono") || undefined,
    email: formData.get("email"),
    role: formData.get("role"),
    password: formData.get("password") || "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const { id, name, cognome, telefono, email, role, password } = parsed.data;

  const existing = await prisma.user.findFirst({
    where: { email, NOT: { id } },
  });
  if (existing) {
    return { error: "Esiste già un utente con questa email." };
  }

  await prisma.user.update({
    where: { id },
    data: {
      name,
      cognome: cognome || null,
      telefono: telefono || null,
      email,
      role,
      ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
    },
  });

  revalidatePath("/admin/dipendenti");
  redirect("/admin/dipendenti");
}

export async function setEmployeeActive(userId: string, active: boolean) {
  await requireAdmin();
  await prisma.user.update({ where: { id: userId }, data: { active } });
  revalidatePath("/admin/dipendenti");
}

const ClientBaseSchema = {
  tipo: z.enum(["AZIENDA", "PERSONA_FISICA"]),
  ragioneSociale: z.string().trim().optional(),
  nome: z.string().trim().optional(),
  cognome: z.string().trim().optional(),
  indirizzo: z.string().trim().optional(),
  citta: z.string().trim().optional(),
  cap: z.string().trim().optional(),
  provincia: z.string().trim().optional(),
  partitaIva: z.string().trim().optional(),
  codiceFiscale: z.string().trim().optional(),
  personaRiferimento: z.string().trim().optional(),
  notes: z.string().trim().optional(),
};

const clientRefine = (data: { tipo: string; ragioneSociale?: string; nome?: string; cognome?: string }) =>
  data.tipo === "AZIENDA" ? !!data.ragioneSociale : !!data.nome && !!data.cognome;

const clientRefineMessage = {
  message:
    "Compila ragione sociale (azienda) oppure nome e cognome (persona fisica).",
};

const ClientSchema = z.object(ClientBaseSchema).refine(clientRefine, clientRefineMessage);

function clientFormFields(formData: FormData) {
  return {
    tipo: formData.get("tipo"),
    ragioneSociale: formData.get("ragioneSociale") || undefined,
    nome: formData.get("nome") || undefined,
    cognome: formData.get("cognome") || undefined,
    indirizzo: formData.get("indirizzo") || undefined,
    citta: formData.get("citta") || undefined,
    cap: formData.get("cap") || undefined,
    provincia: formData.get("provincia") || undefined,
    partitaIva: formData.get("partitaIva") || undefined,
    codiceFiscale: formData.get("codiceFiscale") || undefined,
    personaRiferimento: formData.get("personaRiferimento") || undefined,
    notes: formData.get("notes") || undefined,
  };
}

export async function createClient(_prevState: unknown, formData: FormData) {
  await requireAdmin();

  const parsed = ClientSchema.safeParse(clientFormFields(formData));

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const {
    tipo,
    ragioneSociale,
    nome,
    cognome,
    indirizzo,
    citta,
    cap,
    provincia,
    partitaIva,
    codiceFiscale,
    personaRiferimento,
    notes,
  } = parsed.data;

  const name =
    tipo === "AZIENDA" ? ragioneSociale! : `${nome} ${cognome}`;

  await prisma.client.create({
    data: {
      tipo,
      name,
      ragioneSociale: tipo === "AZIENDA" ? ragioneSociale : null,
      nome: tipo === "PERSONA_FISICA" ? nome : null,
      cognome: tipo === "PERSONA_FISICA" ? cognome : null,
      indirizzo: indirizzo || null,
      citta: citta || null,
      cap: cap || null,
      provincia: provincia || null,
      partitaIva: partitaIva || null,
      codiceFiscale: codiceFiscale || null,
      personaRiferimento: personaRiferimento || null,
      notes: notes || null,
    },
  });
  revalidatePath("/admin/clienti");
  return { success: true };
}

const UpdateClientSchema = z
  .object({ id: z.string().min(1), ...ClientBaseSchema })
  .refine(clientRefine, clientRefineMessage);

export async function updateClient(_prevState: unknown, formData: FormData) {
  await requireAdmin();

  const parsed = UpdateClientSchema.safeParse({
    id: formData.get("id"),
    ...clientFormFields(formData),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const {
    id,
    tipo,
    ragioneSociale,
    nome,
    cognome,
    indirizzo,
    citta,
    cap,
    provincia,
    partitaIva,
    codiceFiscale,
    personaRiferimento,
    notes,
  } = parsed.data;

  const name = tipo === "AZIENDA" ? ragioneSociale! : `${nome} ${cognome}`;

  await prisma.client.update({
    where: { id },
    data: {
      tipo,
      name,
      ragioneSociale: tipo === "AZIENDA" ? ragioneSociale : null,
      nome: tipo === "PERSONA_FISICA" ? nome : null,
      cognome: tipo === "PERSONA_FISICA" ? cognome : null,
      indirizzo: indirizzo || null,
      citta: citta || null,
      cap: cap || null,
      provincia: provincia || null,
      partitaIva: partitaIva || null,
      codiceFiscale: codiceFiscale || null,
      personaRiferimento: personaRiferimento || null,
      notes: notes || null,
    },
  });

  revalidatePath("/admin/clienti");
  redirect("/admin/clienti");
}

const SiteSchema = z.object({
  clientId: z.string().min(1, "Seleziona un cliente"),
  name: z.string().trim().min(1, "Nome sede richiesto"),
  address: z.string().trim().min(1, "Indirizzo richiesto (serve per il cantiere)"),
  capienza: z.coerce.number().int().min(1).optional(),
});

export async function createSite(_prevState: unknown, formData: FormData) {
  await requireAdmin();

  const parsed = SiteSchema.safeParse({
    clientId: formData.get("clientId"),
    name: formData.get("name"),
    address: formData.get("address"),
    capienza: formData.get("capienza") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const coords = await geocodeAddress(parsed.data.address);

  await prisma.site.create({
    data: { ...parsed.data, lat: coords?.lat ?? null, lng: coords?.lng ?? null },
  });
  revalidatePath("/admin/clienti");
  revalidatePath("/admin/pianificazione");
  return { success: true };
}

export async function updateSiteCapienza(siteId: string, capienza: number | null) {
  await requireAdmin();
  await prisma.site.update({ where: { id: siteId }, data: { capienza } });
  revalidatePath("/admin/clienti");
  revalidatePath("/admin/pianificazione");
}

const UpdateSiteSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Nome sede richiesto"),
  address: z.string().trim().min(1, "Indirizzo richiesto (serve per il cantiere)"),
  capienza: z.coerce.number().int().min(1).optional(),
});

export async function updateSite(_prevState: unknown, formData: FormData) {
  await requireAdmin();

  const parsed = UpdateSiteSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    address: formData.get("address"),
    capienza: formData.get("capienza") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const { id, name, address, capienza } = parsed.data;

  const existing = await prisma.site.findUnique({ where: { id } });
  const coords =
    existing && existing.address === address
      ? { lat: existing.lat, lng: existing.lng }
      : await geocodeAddress(address);

  await prisma.site.update({
    where: { id },
    data: {
      name,
      address,
      capienza: capienza ?? null,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
    },
  });

  revalidatePath("/admin/clienti");
  revalidatePath("/admin/pianificazione");
  redirect("/admin/clienti");
}

export async function deleteSite(siteId: string) {
  await requireAdmin();

  const [quoteCount, shiftCount, timeEntryCount] = await Promise.all([
    prisma.quote.count({ where: { siteId } }),
    prisma.shift.count({ where: { siteId } }),
    prisma.timeEntry.count({ where: { siteId } }),
  ]);

  if (quoteCount > 0 || shiftCount > 0 || timeEntryCount > 0) {
    return {
      error: `Impossibile eliminare: ci sono ${quoteCount} preventivi, ${shiftCount} turni e ${timeEntryCount} timbrature collegati a questo cantiere.`,
    };
  }

  await prisma.site.delete({ where: { id: siteId } });
  revalidatePath("/admin/clienti");
  revalidatePath("/admin/pianificazione");
  return { success: true };
}
