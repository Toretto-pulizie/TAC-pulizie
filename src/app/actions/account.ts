"use server";

import * as z from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { createSession } from "@/lib/session";

const NameSchema = z.object({
  name: z.string().trim().min(2, "Nome troppo corto"),
});

export async function updateOwnName(_prevState: unknown, formData: FormData) {
  const session = await verifySession();

  const parsed = NameSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  await prisma.user.update({
    where: { id: session.userId },
    data: { name: parsed.data.name },
  });
  // Il cookie di sessione porta il nome in chiaro (usato per i saluti in UI):
  // va rigenerato subito, altrimenti resta quello vecchio fino al prossimo login.
  await createSession({
    userId: session.userId,
    role: session.role,
    name: parsed.data.name,
  });

  revalidatePath("/admin");
  return { success: true };
}

const PasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Inserisci la password attuale"),
    password: z.string().min(6, "Almeno 6 caratteri"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Le password non coincidono",
    path: ["confirm"],
  });

export async function changeOwnPassword(_prevState: unknown, formData: FormData) {
  const session = await verifySession();

  const parsed = PasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return { error: "Utente non trovato" };

  const currentOk = await bcrypt.compare(
    parsed.data.currentPassword,
    user.passwordHash
  );
  if (!currentOk) return { error: "Password attuale errata" };

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  return { success: true };
}
