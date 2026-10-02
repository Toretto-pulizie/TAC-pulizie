"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/dal";

const InvoiceSchema = z.object({
  clientId: z.string().trim().min(1, "Seleziona un cliente"),
  quoteId: z.string().trim().optional(),
  data: z.string().trim().min(1, "Indica la data"),
  condizioniPagamento: z.string().trim().optional(),
  regimeIva: z.enum(["STANDARD", "REVERSE_CHARGE", "ESENTE"]),
  note: z.string().trim().optional(),
});

const InvoiceLineSchema = z.object({
  descrizione: z.string().trim().min(1, "Indica una descrizione"),
  quantita: z.coerce.number().gt(0, "Quantità non valida"),
  prezzoUnitario: z.coerce.number().min(0, "Prezzo non valido"),
});

// Le righe arrivano indicizzate come "righe.<i>.<campo>", stesso schema già
// usato per le sedi dei Preventivi (vedi collectSiteBlockIndexes in quotes.ts).
function collectLineIndexes(formData: FormData): number[] {
  const indexes = new Set<number>();
  for (const key of formData.keys()) {
    const m = key.match(/^righe\.(\d+)\./);
    if (m) indexes.add(Number(m[1]));
  }
  return Array.from(indexes).sort((a, b) => a - b);
}

export async function saveInvoice(_prevState: unknown, formData: FormData) {
  await requireModule("fatturazione");

  const id = formData.get("id");

  const parsed = InvoiceSchema.safeParse({
    clientId: formData.get("clientId"),
    quoteId: formData.get("quoteId") || undefined,
    data: formData.get("data"),
    condizioniPagamento: formData.get("condizioniPagamento") || undefined,
    regimeIva: formData.get("regimeIva"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const { clientId, quoteId, condizioniPagamento, regimeIva, note } = parsed.data;
  const data = new Date(`${parsed.data.data}T00:00:00`);
  if (Number.isNaN(data.getTime())) {
    return { error: "Data non valida" };
  }

  const indexes = collectLineIndexes(formData);
  if (indexes.length === 0) {
    return { error: "Aggiungi almeno una riga alla fattura" };
  }

  const righe: { descrizione: string; quantita: number; prezzoUnitario: number; importo: number; ordine: number }[] = [];
  for (const [ordine, i] of indexes.entries()) {
    const parsedLine = InvoiceLineSchema.safeParse({
      descrizione: formData.get(`righe.${i}.descrizione`),
      quantita: formData.get(`righe.${i}.quantita`) || 1,
      prezzoUnitario: formData.get(`righe.${i}.prezzoUnitario`),
    });
    if (!parsedLine.success) {
      return { error: parsedLine.error.issues[0]?.message ?? "Riga non valida" };
    }
    const d = parsedLine.data;
    righe.push({
      descrizione: d.descrizione,
      quantita: d.quantita,
      prezzoUnitario: d.prezzoUnitario,
      importo: Math.round(d.quantita * d.prezzoUnitario * 100) / 100,
      ordine,
    });
  }

  if (typeof id === "string" && id) {
    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) return { error: "Fattura non trovata" };
    if (existing.stato !== "BOZZA") {
      return { error: "Solo una fattura in bozza può essere modificata" };
    }
    await prisma.$transaction([
      prisma.invoiceLine.deleteMany({ where: { invoiceId: id } }),
      prisma.invoice.update({
        where: { id },
        data: {
          // Una nota di credito resta intestata al cliente della fattura stornata.
          clientId: existing.tipoDocumento === "TD04" ? existing.clientId : clientId,
          quoteId: quoteId || null,
          data,
          condizioniPagamento: condizioniPagamento || null,
          regimeIva,
          note: note || null,
          righe: { create: righe },
        },
      }),
    ]);
    revalidatePath("/admin/fatturazione");
    return { success: true, id };
  }

  const invoice = await prisma.invoice.create({
    data: {
      clientId,
      quoteId: quoteId || null,
      data,
      condizioniPagamento: condizioniPagamento || null,
      regimeIva,
      note: note || null,
      righe: { create: righe },
    },
  });

  revalidatePath("/admin/fatturazione");
  return { success: true, id: invoice.id };
}

// Numera e blocca la fattura (BOZZA -> EMESSA): assegna anno/numero cercando
// il massimo esistente per l'anno corrente, così una bozza eliminata non
// lascia mai un buco nella numerazione. Da qui in poi la fattura non è più
// modificabile (saveInvoice rifiuta se stato non è BOZZA).
export async function emettiFattura(id: string) {
  await requireModule("fatturazione");

  await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUniqueOrThrow({ where: { id } });
    if (invoice.stato !== "BOZZA") {
      throw new Error("Solo una fattura in bozza può essere emessa");
    }
    const anno = invoice.data.getFullYear();
    const last = await tx.invoice.findFirst({
      where: { anno },
      orderBy: { numero: "desc" },
    });
    const numero = (last?.numero ?? 0) + 1;
    await tx.invoice.update({
      where: { id },
      data: { anno, numero, stato: "EMESSA" },
    });
  });

  revalidatePath("/admin/fatturazione");
  return { success: true };
}

// Crea una nota di credito (TD04) in bozza a partire da una fattura già
// emessa: copia cliente, regime IVA e righe, che poi si possono togliere o
// ridurre per stornare solo una parte. Il numero si assegna all'emissione,
// nella stessa sequenza delle fatture.
export async function createCreditNote(invoiceId: string) {
  await requireModule("fatturazione");

  const original = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { righe: { orderBy: { ordine: "asc" } } },
  });
  if (!original) return { error: "Fattura non trovata" };
  if (original.tipoDocumento !== "TD01") {
    return { error: "Si può stornare solo una fattura" };
  }
  if (original.stato === "BOZZA") {
    return { error: "Una bozza si modifica direttamente: la nota di credito serve per una fattura già emessa" };
  }

  const nota = await prisma.invoice.create({
    data: {
      tipoDocumento: "TD04",
      rettificaDiId: original.id,
      clientId: original.clientId,
      regimeIva: original.regimeIva,
      righe: {
        create: original.righe.map((r, ordine) => ({
          descrizione: r.descrizione,
          quantita: r.quantita,
          prezzoUnitario: r.prezzoUnitario,
          importo: r.importo,
          ordine,
        })),
      },
    },
  });

  revalidatePath("/admin/fatturazione");
  return { success: true, id: nota.id };
}

// Segna a mano una fattura emessa come "inviata" (es. spedita con un altro
// sistema): serve a tenerla allineata finché l'invio allo SDI non è collegato.
// Resta traccia nello storico degli eventi.
export async function markInvoiceSent(id: string) {
  await requireModule("fatturazione");

  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) return { error: "Fattura non trovata" };
  if (invoice.stato !== "EMESSA") {
    return { error: "Solo una fattura emessa può essere segnata come inviata" };
  }

  await prisma.$transaction([
    prisma.invoice.update({ where: { id }, data: { stato: "INVIATA" } }),
    prisma.invoiceEvent.create({
      data: {
        invoiceId: id,
        tipo: "INVIATA_MANUALMENTE",
        dettaglio: "Segnata come inviata a mano (fuori da Toretto)",
      },
    }),
  ]);

  revalidatePath("/admin/fatturazione");
  return { success: true };
}

// Annulla un "segna come inviata" fatto per errore. Possibile solo se
// l'invio non è passato da Aruba (nessun identificativo di caricamento).
export async function undoMarkInvoiceSent(id: string) {
  await requireModule("fatturazione");

  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) return { error: "Fattura non trovata" };
  if (invoice.stato !== "INVIATA" || invoice.arubaUploadFileName) {
    return { error: "Questa fattura non può essere riportata a emessa" };
  }

  await prisma.$transaction([
    prisma.invoice.update({ where: { id }, data: { stato: "EMESSA" } }),
    prisma.invoiceEvent.create({
      data: {
        invoiceId: id,
        tipo: "RIPORTATA_A_EMESSA",
        dettaglio: "Segnalazione di invio annullata",
      },
    }),
  ]);

  revalidatePath("/admin/fatturazione");
  return { success: true };
}

export async function deleteInvoice(id: string) {
  await requireModule("fatturazione");

  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) return { error: "Fattura non trovata" };
  if (invoice.stato !== "BOZZA") {
    return { error: "Solo una fattura in bozza può essere eliminata" };
  }
  await prisma.invoice.delete({ where: { id } });
  revalidatePath("/admin/fatturazione");
  return { success: true };
}
