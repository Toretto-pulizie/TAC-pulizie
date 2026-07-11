"use server";

import * as z from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/dal";

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

const ClientSchema = z
  .object({
    tipo: z.enum(["AZIENDA", "PERSONA_FISICA"]),
    ragioneSociale: z.string().trim().optional(),
    nome: z.string().trim().optional(),
    cognome: z.string().trim().optional(),
    indirizzo: z.string().trim().optional(),
    citta: z.string().trim().optional(),
    cap: z.string().trim().optional(),
    provincia: z.string().trim().optional(),
    notes: z.string().trim().optional(),
  })
  .refine(
    (data) =>
      data.tipo === "AZIENDA"
        ? !!data.ragioneSociale
        : !!data.nome && !!data.cognome,
    {
      message:
        "Compila ragione sociale (azienda) oppure nome e cognome (persona fisica).",
    }
  );

export async function createClient(_prevState: unknown, formData: FormData) {
  await requireAdmin();

  const parsed = ClientSchema.safeParse({
    tipo: formData.get("tipo"),
    ragioneSociale: formData.get("ragioneSociale") || undefined,
    nome: formData.get("nome") || undefined,
    cognome: formData.get("cognome") || undefined,
    indirizzo: formData.get("indirizzo") || undefined,
    citta: formData.get("citta") || undefined,
    cap: formData.get("cap") || undefined,
    provincia: formData.get("provincia") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const { tipo, ragioneSociale, nome, cognome, indirizzo, citta, cap, provincia, notes } =
    parsed.data;

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
      notes: notes || null,
    },
  });
  revalidatePath("/admin/clienti");
  return { success: true };
}

const SiteSchema = z.object({
  clientId: z.string().min(1, "Seleziona un cliente"),
  name: z.string().trim().min(1, "Nome sede richiesto"),
  address: z.string().trim().optional(),
  capienza: z.coerce.number().int().min(1).optional(),
});

export async function createSite(_prevState: unknown, formData: FormData) {
  await requireAdmin();

  const parsed = SiteSchema.safeParse({
    clientId: formData.get("clientId"),
    name: formData.get("name"),
    address: formData.get("address") || undefined,
    capienza: formData.get("capienza") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  await prisma.site.create({ data: parsed.data });
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
