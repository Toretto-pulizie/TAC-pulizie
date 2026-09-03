"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/dal";

const ServiceTypeLabelSchema = z.object({
  tipo: z.enum(["ONE_SHOT", "PASS_SETTIMANALE", "PASS_MENSILE"]),
  etichetta: z.string().trim().min(1, "Il nome non può essere vuoto"),
});

export async function updateServiceTypeLabel(
  _prevState: unknown,
  formData: FormData
) {
  await requireAdmin();

  const parsed = ServiceTypeLabelSchema.safeParse({
    tipo: formData.get("tipo"),
    etichetta: formData.get("etichetta"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  await prisma.serviceTypeLabel.upsert({
    where: { tipo: parsed.data.tipo },
    update: { etichetta: parsed.data.etichetta },
    create: parsed.data,
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
