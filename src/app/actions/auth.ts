"use server";

import * as z from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, deleteSession } from "@/lib/session";

const LoginSchema = z.object({
  email: z.string().trim().min(1, "Inserisci l'email"),
  password: z.string().min(1, "Inserisci la password"),
});

export type LoginState =
  | { error: string }
  | undefined;

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Inserisci email e password." };
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.active) {
    return { error: "Credenziali non valide." };
  }

  const passwordOk = await bcrypt.compare(password, user.passwordHash);
  if (!passwordOk) {
    return { error: "Credenziali non valide." };
  }

  await createSession({ userId: user.id, role: user.role, name: user.name });

  redirect(user.role === "ADMIN" ? "/admin" : "/dipendente");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
