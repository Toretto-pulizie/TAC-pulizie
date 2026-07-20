"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/dal";
import { geocodeAddress } from "@/lib/geocode";
import { computeListPrice } from "@/lib/quotes";

const QuoteSchema = z
  .object({
    serviceType: z.enum(["ONE_SHOT", "PASS_SETTIMANALE", "PASS_MENSILE"]),
    ore: z.coerce.number().min(0, "Ore non valide"),
    spostamento: z.coerce.number().min(0).default(0),
    oneShotCount: z.coerce.number().min(0).default(1),
    passSettimanale: z.coerce.number().min(0).optional(),
    passMensile: z.coerce.number().min(0).optional(),
    oreVetri: z.coerce.number().min(0).default(0),
    passVetriAnno: z.coerce.number().min(0).default(0),
    tariffaOraria: z.coerce.number().min(0),
    tariffaVetri: z.coerce.number().min(0),
    tariffaConsuntivo: z.coerce.number().min(0),
    prezzoVenduto: z.coerce.number().min(0).optional(),
    scontoPct: z.coerce.number().min(0).max(100).optional(),
    condizioniPagamento: z.string().trim().optional(),
    tipoPrestazione: z.string().trim().min(1, "Seleziona il tipo di prestazione"),
    note: z.string().trim().optional(),
  })
  .refine(
    (data) =>
      data.serviceType !== "PASS_SETTIMANALE" ||
      (data.passSettimanale != null && data.passSettimanale > 0),
    { message: "Indica gli interventi/settimana" }
  )
  .refine(
    (data) =>
      data.serviceType !== "PASS_MENSILE" ||
      (data.passMensile != null && data.passMensile > 0),
    { message: "Indica gli interventi/mese" }
  );

function parseQuoteFormData(formData: FormData) {
  return QuoteSchema.safeParse({
    serviceType: formData.get("serviceType"),
    ore: formData.get("ore"),
    spostamento: formData.get("spostamento") || 0,
    oneShotCount: formData.get("oneShotCount") || 1,
    passSettimanale: formData.get("passSettimanale") || undefined,
    passMensile: formData.get("passMensile") || undefined,
    oreVetri: formData.get("oreVetri") || 0,
    passVetriAnno: formData.get("passVetriAnno") || 0,
    tariffaOraria: formData.get("tariffaOraria"),
    tariffaVetri: formData.get("tariffaVetri"),
    tariffaConsuntivo: formData.get("tariffaConsuntivo"),
    prezzoVenduto: formData.get("prezzoVenduto") || undefined,
    scontoPct: formData.get("scontoPct") || undefined,
    condizioniPagamento: formData.get("condizioniPagamento") || undefined,
    tipoPrestazione: formData.get("tipoPrestazione"),
    note: formData.get("note") || undefined,
  });
}

async function resolveSiteId(formData: FormData): Promise<string> {
  const clientId = formData.get("clientId");
  const siteSelection = formData.get("siteSelection");

  if (typeof clientId !== "string" || !clientId) {
    throw new Error("Seleziona un cliente");
  }
  if (typeof siteSelection !== "string" || !siteSelection) {
    throw new Error("Seleziona una sede");
  }

  if (siteSelection !== "__base__" && siteSelection !== "__custom__") {
    return siteSelection;
  }

  let address: string;
  if (siteSelection === "__custom__") {
    const custom = formData.get("nuovoIndirizzo");
    if (typeof custom !== "string" || !custom.trim()) {
      throw new Error("Indica il nuovo indirizzo");
    }
    address = custom.trim();
  } else {
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new Error("Cliente non trovato");
    address = [client.indirizzo, client.cap, client.citta, client.provincia]
      .filter(Boolean)
      .join(", ");
    if (!address) {
      throw new Error('Il cliente non ha un indirizzo di base: usa "Altro"');
    }
  }

  const coords = await geocodeAddress(address);
  const site = await prisma.site.create({
    data: {
      clientId,
      name: siteSelection === "__base__" ? "Sede" : "Nuova sede",
      address,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
    },
  });

  return site.id;
}

export async function saveQuote(_prevState: unknown, formData: FormData) {
  await requireAdmin();

  const id = formData.get("id");

  const parsed = parseQuoteFormData(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  let siteId: string;
  try {
    siteId = await resolveSiteId(formData);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Errore nella sede" };
  }

  const { note, condizioniPagamento, scontoPct, ...data } = parsed.data;

  let prezzoVenduto = data.prezzoVenduto;
  if (scontoPct != null) {
    const listPrice = computeListPrice({
      serviceType: data.serviceType,
      ore: data.ore,
      spostamento: data.spostamento,
      oneShotCount: data.oneShotCount,
      passSettimanale: data.passSettimanale ?? null,
      passMensile: data.passMensile ?? null,
      oreVetri: data.oreVetri,
      passVetriAnno: data.passVetriAnno,
      tariffaOraria: data.tariffaOraria,
      tariffaVetri: data.tariffaVetri,
    });
    prezzoVenduto = Math.round(listPrice * (1 - scontoPct / 100) * 100) / 100;
  }

  const quoteData = {
    ...data,
    prezzoVenduto,
    siteId,
    note: note || null,
    condizioniPagamento: condizioniPagamento || null,
  };

  if (typeof id === "string" && id) {
    await prisma.quote.update({ where: { id }, data: quoteData });
  } else {
    await prisma.quote.create({ data: quoteData });
  }

  revalidatePath("/admin/preventivi");
  revalidatePath("/admin/consuntivi");
  revalidatePath("/admin/clienti");
  return { success: true, id: typeof id === "string" ? id : undefined };
}

export async function setQuoteStatus(
  id: string,
  status: "IN_TRATTATIVA" | "ACCETTATO" | "RIFIUTATO"
) {
  await requireAdmin();

  await prisma.quote.update({
    where: { id },
    data: {
      status,
      closedAt: status === "IN_TRATTATIVA" ? null : new Date(),
    },
  });

  revalidatePath("/admin/preventivi");
  revalidatePath("/admin/consuntivi");
}

export async function deleteQuote(id: string) {
  await requireAdmin();
  await prisma.quote.delete({ where: { id } });
  revalidatePath("/admin/preventivi");
  revalidatePath("/admin/consuntivi");
}
