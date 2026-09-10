"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/dal";
import { geocodeAddress } from "@/lib/geocode";
import { computeListPrice } from "@/lib/quotes";
import { notifyAdmins } from "@/lib/notifications";

const QuoteSchema = z.object({
  clientId: z.string().trim().min(1, "Seleziona un cliente"),
  condizioniPagamento: z.string().trim().optional(),
});

const QuoteSiteSchema = z
  .object({
    siteSelection: z.string().trim().min(1, "Seleziona una sede"),
    nuovoIndirizzo: z.string().trim().optional(),
    tipoPrestazione: z.string().trim().min(1, "Seleziona il tipo di servizio"),
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
    adeguamento: z.coerce.number().optional(),
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

// I campi di ogni sede arrivano indicizzati come "sites.<i>.<campo>": questa
// funzione trova quali indici sono presenti nel form, in ordine.
function collectSiteBlockIndexes(formData: FormData): number[] {
  const indexes = new Set<number>();
  for (const key of formData.keys()) {
    const m = key.match(/^sites\.(\d+)\./);
    if (m) indexes.add(Number(m[1]));
  }
  return Array.from(indexes).sort((a, b) => a - b);
}

function parseSiteBlockFormData(formData: FormData, i: number) {
  const get = (field: string) => formData.get(`sites.${i}.${field}`);
  return {
    siteSelection: get("siteSelection"),
    nuovoIndirizzo: get("nuovoIndirizzo") || undefined,
    tipoPrestazione: get("tipoPrestazione"),
    serviceType: get("serviceType"),
    ore: get("ore"),
    spostamento: get("spostamento") || 0,
    oneShotCount: get("oneShotCount") || 1,
    passSettimanale: get("passSettimanale") || undefined,
    passMensile: get("passMensile") || undefined,
    oreVetri: get("oreVetri") || 0,
    passVetriAnno: get("passVetriAnno") || 0,
    tariffaOraria: get("tariffaOraria"),
    tariffaVetri: get("tariffaVetri"),
    tariffaConsuntivo: get("tariffaConsuntivo"),
    prezzoVenduto: get("prezzoVenduto") || undefined,
    scontoPct: get("scontoPct") || undefined,
    adeguamento: get("adeguamento") || undefined,
    note: get("note") || undefined,
  };
}

async function resolveSiteId(
  clientId: string,
  siteSelection: string,
  nuovoIndirizzo: string | undefined
): Promise<string> {
  if (siteSelection !== "__base__" && siteSelection !== "__custom__") {
    return siteSelection;
  }

  let address: string;
  if (siteSelection === "__custom__") {
    if (!nuovoIndirizzo?.trim()) {
      throw new Error("Indica il nuovo indirizzo");
    }
    address = nuovoIndirizzo.trim();
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
  await requireModule("preventivi");

  const id = formData.get("id");

  const parsedQuote = QuoteSchema.safeParse({
    clientId: formData.get("clientId"),
    condizioniPagamento: formData.get("condizioniPagamento") || undefined,
  });
  if (!parsedQuote.success) {
    return { error: parsedQuote.error.issues[0]?.message ?? "Dati non validi" };
  }
  const { clientId, condizioniPagamento } = parsedQuote.data;

  const indexes = collectSiteBlockIndexes(formData);
  if (indexes.length === 0) {
    return { error: "Aggiungi almeno una sede al preventivo" };
  }

  const siteBlocksData: {
    siteId: string;
    tipoPrestazione: string;
    serviceType: "ONE_SHOT" | "PASS_SETTIMANALE" | "PASS_MENSILE";
    ore: number;
    spostamento: number;
    oneShotCount: number;
    passSettimanale: number | null;
    passMensile: number | null;
    oreVetri: number;
    passVetriAnno: number;
    tariffaOraria: number;
    tariffaVetri: number;
    tariffaConsuntivo: number;
    scontoPct: number | null;
    prezzoVenduto: number | null;
    adeguamento: number | null;
    note: string | null;
  }[] = [];

  for (const i of indexes) {
    const parsed = QuoteSiteSchema.safeParse(parseSiteBlockFormData(formData, i));
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Dati sede non validi" };
    }
    const d = parsed.data;

    let siteId: string;
    try {
      siteId = await resolveSiteId(clientId, d.siteSelection, d.nuovoIndirizzo);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Errore nella sede" };
    }

    let prezzoVenduto = d.prezzoVenduto ?? null;
    if (d.scontoPct != null) {
      const listPrice = computeListPrice({
        serviceType: d.serviceType,
        ore: d.ore,
        spostamento: d.spostamento,
        oneShotCount: d.oneShotCount,
        passSettimanale: d.passSettimanale ?? null,
        passMensile: d.passMensile ?? null,
        oreVetri: d.oreVetri,
        passVetriAnno: d.passVetriAnno,
        tariffaOraria: d.tariffaOraria,
        tariffaVetri: d.tariffaVetri,
      });
      prezzoVenduto = Math.round(listPrice * (1 - d.scontoPct / 100) * 100) / 100;
    }

    siteBlocksData.push({
      siteId,
      tipoPrestazione: d.tipoPrestazione,
      serviceType: d.serviceType,
      ore: d.ore,
      spostamento: d.spostamento,
      oneShotCount: d.oneShotCount,
      passSettimanale: d.passSettimanale ?? null,
      passMensile: d.passMensile ?? null,
      oreVetri: d.oreVetri,
      passVetriAnno: d.passVetriAnno,
      tariffaOraria: d.tariffaOraria,
      tariffaVetri: d.tariffaVetri,
      tariffaConsuntivo: d.tariffaConsuntivo,
      scontoPct: d.scontoPct ?? null,
      prezzoVenduto,
      adeguamento: d.adeguamento ?? null,
      note: d.note ?? null,
    });
  }

  const quoteBaseData = {
    clientId,
    condizioniPagamento: condizioniPagamento || null,
  };

  // Allegati selezionati (checkbox "attachmentIds"): salvati nell'ordine in
  // cui compaiono nell'elenco (l'ordine di visualizzazione, non quello di
  // selezione dell'utente).
  const attachmentIds = formData.getAll("attachmentIds").map(String);
  const attachmentsData = attachmentIds.map((attachmentId, ordine) => ({
    attachmentId,
    ordine,
  }));

  if (typeof id === "string" && id) {
    await prisma.$transaction([
      prisma.quoteSite.deleteMany({ where: { quoteId: id } }),
      prisma.quoteAttachment.deleteMany({ where: { quoteId: id } }),
      prisma.quote.update({
        where: { id },
        data: {
          ...quoteBaseData,
          sites: { create: siteBlocksData },
          attachments: { create: attachmentsData },
        },
      }),
    ]);
  } else {
    await prisma.quote.create({
      data: {
        ...quoteBaseData,
        sites: { create: siteBlocksData },
        attachments: { create: attachmentsData },
      },
    });
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
  await requireModule("preventivi");

  const quote = await prisma.quote.update({
    where: { id },
    data: {
      status,
      closedAt: status === "IN_TRATTATIVA" ? null : new Date(),
    },
    include: { client: true, sites: { include: { site: true } } },
  });

  if (status === "ACCETTATO" || status === "RIFIUTATO") {
    const sedi = quote.sites.map((s) => s.site.name).join(", ");
    await notifyAdmins(
      `Preventivo ${status === "ACCETTATO" ? "accettato" : "rifiutato"}: ${quote.client.name} — ${sedi}`,
      "/admin/preventivi"
    );
  }

  revalidatePath("/admin/preventivi");
  revalidatePath("/admin/consuntivi");
}

export async function deleteQuote(id: string) {
  await requireModule("preventivi");
  await prisma.quote.delete({ where: { id } });
  revalidatePath("/admin/preventivi");
  revalidatePath("/admin/consuntivi");
}
