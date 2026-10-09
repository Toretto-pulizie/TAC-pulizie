"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/dal";

function revalidateAll() {
  revalidatePath("/admin/chiusure");
  revalidatePath("/admin/commesse");
  revalidatePath("/admin/consuntivi");
  revalidatePath("/admin/fatturazione");
  revalidatePath("/admin/statistiche");
  revalidatePath("/admin");
}

const PeriodSchema = z.object({
  nome: z.string().trim().min(1, "Indica un nome (es. Chiusura estiva)"),
  dal: z.string().min(1, "Indica la data di inizio"),
  al: z.string().min(1, "Indica la data di fine"),
});

export async function addClosurePeriod(_prev: unknown, formData: FormData) {
  await requireModule("chiusure");
  const parsed = PeriodSchema.safeParse({
    nome: formData.get("nome"),
    dal: formData.get("dal"),
    al: formData.get("al"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  const dal = new Date(`${parsed.data.dal}T00:00:00`);
  const al = new Date(`${parsed.data.al}T00:00:00`);
  if (Number.isNaN(dal.getTime()) || Number.isNaN(al.getTime())) {
    return { error: "Date non valide" };
  }
  if (al < dal) return { error: "La data di fine è prima di quella di inizio" };
  await prisma.closurePeriod.create({ data: { nome: parsed.data.nome, dal, al } });
  revalidateAll();
  return { success: true as const };
}

export async function deleteClosurePeriod(id: string) {
  await requireModule("chiusure");
  await prisma.closurePeriod.delete({ where: { id } });
  revalidateAll();
}

export async function setChiusuraScelta(
  quoteId: string,
  scelta: "DA_DEFINIRE" | "CON_PULIZIE" | "SENZA_PULIZIE",
  note: string
) {
  await requireModule("chiusure");
  const prev = await prisma.quote.findUnique({
    where: { id: quoteId },
    select: { chiusuraScelta: true, chiusuraSceltaIl: true },
  });
  if (!prev) return { error: "Offerta non trovata" };
  const sceltaIl =
    scelta === "DA_DEFINIRE"
      ? null
      : prev.chiusuraScelta === scelta
        ? prev.chiusuraSceltaIl
        : new Date();
  await prisma.quote.update({
    where: { id: quoteId },
    data: { chiusuraScelta: scelta, chiusuraNote: note.trim() || null, chiusuraSceltaIl: sceltaIl },
  });
  revalidateAll();
  revalidatePath("/admin/preventivi");
  return { success: true as const };
}
