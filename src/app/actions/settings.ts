"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/dal";

const ServiceTypeLabelSchema = z.object({
  tipo: z.enum(["ONE_SHOT", "PASS_SETTIMANALE", "PASS_MENSILE"]),
  etichetta: z.string().trim().min(1, "Il nome non può essere vuoto"),
  abbreviazione: z.string().trim().optional(),
  mostraCadenza: z.boolean(),
});

export async function updateServiceTypeLabel(
  _prevState: unknown,
  formData: FormData
) {
  await requireAdmin();

  const parsed = ServiceTypeLabelSchema.safeParse({
    tipo: formData.get("tipo"),
    etichetta: formData.get("etichetta"),
    abbreviazione: formData.get("abbreviazione") || undefined,
    mostraCadenza: formData.get("mostraCadenza") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const data = {
    tipo: parsed.data.tipo,
    etichetta: parsed.data.etichetta,
    abbreviazione: parsed.data.abbreviazione ?? null,
    mostraCadenza: parsed.data.mostraCadenza,
  };

  await prisma.serviceTypeLabel.upsert({
    where: { tipo: parsed.data.tipo },
    update: data,
    create: data,
  });

  revalidatePath("/admin/impostazioni");
  revalidatePath("/admin/preventivi");
  return { success: true };
}

export async function updateHomeSettings(settings: {
  showAlLavoro: boolean;
  showPermessi: boolean;
  showPreventivi: boolean;
  showTurni: boolean;
  showTotalePreventiviAccettati: boolean;
  showTotaleConsuntivi: boolean;
  showAlLavoroBar: boolean;
  showPreventiviBar: boolean;
  showTotaleConsuntiviBar: boolean;
}) {
  await requireAdmin();

  await prisma.homeSettings.upsert({
    where: { id: "singleton" },
    update: settings,
    create: { id: "singleton", ...settings },
  });

  revalidatePath("/admin/impostazioni");
  revalidatePath("/admin");
}

export async function updateStatisticheSettings(settings: {
  oreDisponibiliNette: boolean;
}) {
  await requireAdmin();

  await prisma.statisticheSettings.upsert({
    where: { id: "singleton" },
    update: settings,
    create: { id: "singleton", ...settings },
  });

  revalidatePath("/admin/impostazioni");
  revalidatePath("/admin/statistiche");
}

export async function updateNotificationSettings(settings: {
  amministrativoPermessi: boolean;
  amministrativoPreventivi: boolean;
  amministrativoSopralluoghi: boolean;
}) {
  await requireAdmin();

  await prisma.notificationSettings.upsert({
    where: { id: "singleton" },
    update: settings,
    create: { id: "singleton", ...settings },
  });

  revalidatePath("/admin/impostazioni");
}

const BankSettingsSchema = z.object({
  nomeBanca: z.string().trim(),
  iban: z.string().trim(),
  intestatario: z.string().trim(),
  swiftBic: z.string().trim(),
});

export async function updateBankSettings(
  _prevState: unknown,
  formData: FormData
) {
  await requireAdmin();

  const parsed = BankSettingsSchema.safeParse({
    nomeBanca: formData.get("nomeBanca"),
    iban: formData.get("iban"),
    intestatario: formData.get("intestatario"),
    swiftBic: formData.get("swiftBic"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  await prisma.bankSettings.upsert({
    where: { id: "singleton" },
    update: parsed.data,
    create: { id: "singleton", ...parsed.data },
  });

  revalidatePath("/admin/impostazioni");
  revalidatePath("/admin/preventivi");
  return { success: true };
}

const CompanySettingsSchema = z.object({
  denominazione: z.string().trim().optional(),
  nome: z.string().trim().optional(),
  cognome: z.string().trim().optional(),
  partitaIva: z.string().trim(),
  codiceFiscale: z.string().trim(),
  indirizzo: z.string().trim(),
  cap: z.string().trim(),
  citta: z.string().trim(),
  provincia: z.string().trim(),
  regimeFiscale: z.string().trim().min(1, "Indica il regime fiscale"),
  telefono: z.string().trim(),
  email: z.string().trim(),
  pec: z.string().trim(),
});

export async function updateCompanySettings(
  _prevState: unknown,
  formData: FormData
) {
  await requireAdmin();

  const parsed = CompanySettingsSchema.safeParse({
    denominazione: formData.get("denominazione") || undefined,
    nome: formData.get("nome") || undefined,
    cognome: formData.get("cognome") || undefined,
    partitaIva: formData.get("partitaIva"),
    codiceFiscale: formData.get("codiceFiscale"),
    indirizzo: formData.get("indirizzo"),
    cap: formData.get("cap"),
    citta: formData.get("citta"),
    provincia: formData.get("provincia"),
    regimeFiscale: formData.get("regimeFiscale"),
    telefono: formData.get("telefono"),
    email: formData.get("email"),
    pec: formData.get("pec"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const data = {
    denominazione: parsed.data.denominazione ?? null,
    nome: parsed.data.nome ?? null,
    cognome: parsed.data.cognome ?? null,
    partitaIva: parsed.data.partitaIva,
    codiceFiscale: parsed.data.codiceFiscale,
    indirizzo: parsed.data.indirizzo,
    cap: parsed.data.cap,
    citta: parsed.data.citta,
    provincia: parsed.data.provincia,
    regimeFiscale: parsed.data.regimeFiscale,
    telefono: parsed.data.telefono,
    email: parsed.data.email,
    pec: parsed.data.pec,
  };

  await prisma.companySettings.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });

  revalidatePath("/admin/impostazioni");
  revalidatePath("/admin/fatturazione");
  return { success: true };
}
