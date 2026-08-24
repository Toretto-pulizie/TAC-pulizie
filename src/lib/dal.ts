import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import type { ModuleKey } from "@/lib/modules";

export const verifySession = cache(async () => {
  const session = await getSession();
  if (!session?.userId) {
    redirect("/login");
  }
  return session;
});

export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session?.userId) return null;

  return prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      allowedModules: true,
    },
  });
});

export async function requireAdmin() {
  const session = await verifySession();
  if (session.role !== "ADMIN") {
    redirect("/dipendente");
  }
  return session;
}

// Titolare (ADMIN) always passes. An EMPLOYEE passes only if this specific
// module was explicitly granted to them — "Utenti" and "Impostazioni" are
// never grantable, so they never appear in allowedModules.
export async function requireModule(moduleKey: ModuleKey) {
  const session = await verifySession();
  if (session.role === "ADMIN") return session;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { allowedModules: true },
  });
  if (!user?.allowedModules.includes(moduleKey)) {
    redirect("/dipendente");
  }
  return session;
}
