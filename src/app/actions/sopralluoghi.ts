"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession, requireModule } from "@/lib/dal";
import { notifyAdmins } from "@/lib/notifications";

const SopralluogoSchema = z.object({
  richiestaTipo: z.enum(["VERBALE", "SCRITTA", "TELEFONICA"]).optional(),
  richiestaData: z.string().trim().optional(),
  clienteNome: z.string().trim().optional(),
  clienteIndirizzo: z.string().trim().optional(),
  clienteCap: z.string().trim().optional(),
  clienteCitta: z.string().trim().optional(),
  clienteTelefono: z.string().trim().optional(),
  clienteEmail: z.string().trim().optional(),
  clientePec: z.string().trim().optional(),
  clientePartitaIva: z.string().trim().optional(),
  clienteCodiceUnivoco: z.string().trim().optional(),
  luogoIndirizzo: z.string().trim().optional(),
  luogoCitta: z.string().trim().optional(),
  referenteNome: z.string().trim().optional(),
  referenteCellulare: z.string().trim().optional(),
  referenteEmail: z.string().trim().optional(),
  contenutiAltro: z.string().trim().optional(),
  note: z.string().trim().optional(),
  tipologiaLavoro: z.string().trim().optional(),
  dataSopralluogo: z.string().trim().optional(),
});

function emptyToNull(v: string | undefined) {
  return v && v.length > 0 ? v : null;
}

function toFloat(v: string | undefined) {
  if (!v) return null;
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function toInt(v: string | undefined) {
  if (!v) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

function toDate(v: string | undefined) {
  if (!v) return null;
  const d = new Date(`${v}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function field(formData: FormData, key: string) {
  return (formData.get(key) as string | null)?.trim();
}

// I campi di ogni blocco dinamico arrivano indicizzati come
// "<prefix>.<i>.<campo>": trova quali indici sono presenti nel form, in
// ordine (stesso schema di collectSiteBlockIndexes in actions/quotes.ts).
function collectBlockIndexes(formData: FormData, prefix: string): number[] {
  const indexes = new Set<number>();
  const re = new RegExp(`^${prefix}\\.(\\d+)\\.`);
  for (const key of formData.keys()) {
    const m = key.match(re);
    if (m) indexes.add(Number(m[1]));
  }
  return Array.from(indexes).sort((a, b) => a - b);
}

export async function createSopralluogo(_prevState: unknown, formData: FormData) {
  await requireModule("amministrazione");
  const session = await verifySession();

  const parsed = SopralluogoSchema.safeParse({
    richiestaTipo: formData.get("richiestaTipo") || undefined,
    richiestaData: formData.get("richiestaData") || undefined,
    clienteNome: formData.get("clienteNome") || undefined,
    clienteIndirizzo: formData.get("clienteIndirizzo") || undefined,
    clienteCap: formData.get("clienteCap") || undefined,
    clienteCitta: formData.get("clienteCitta") || undefined,
    clienteTelefono: formData.get("clienteTelefono") || undefined,
    clienteEmail: formData.get("clienteEmail") || undefined,
    clientePec: formData.get("clientePec") || undefined,
    clientePartitaIva: formData.get("clientePartitaIva") || undefined,
    clienteCodiceUnivoco: formData.get("clienteCodiceUnivoco") || undefined,
    luogoIndirizzo: formData.get("luogoIndirizzo") || undefined,
    luogoCitta: formData.get("luogoCitta") || undefined,
    referenteNome: formData.get("referenteNome") || undefined,
    referenteCellulare: formData.get("referenteCellulare") || undefined,
    referenteEmail: formData.get("referenteEmail") || undefined,
    contenutiAltro: formData.get("contenutiAltro") || undefined,
    note: formData.get("note") || undefined,
    tipologiaLavoro: formData.get("tipologiaLavoro") || undefined,
    dataSopralluogo: formData.get("dataSopralluogo") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const d = parsed.data;

  const ambienti = collectBlockIndexes(formData, "ambienti")
    .map((i) => ({
      ambiente: field(formData, `ambienti.${i}.ambiente`) ?? "",
      numero: emptyToNull(field(formData, `ambienti.${i}.numero`)),
      mq: emptyToNull(field(formData, `ambienti.${i}.mq`)),
      pavimento: emptyToNull(field(formData, `ambienti.${i}.pavimento`)),
      finestre: emptyToNull(field(formData, `ambienti.${i}.finestre`)),
      note: emptyToNull(field(formData, `ambienti.${i}.note`)),
      ordine: i,
    }))
    .filter((a) => a.ambiente || a.numero || a.mq || a.pavimento || a.finestre || a.note);

  const richieste = collectBlockIndexes(formData, "richieste")
    .map((i) => ({
      tipo: field(formData, `richieste.${i}.tipo`) ?? "",
      frequenza: emptyToNull(field(formData, `richieste.${i}.frequenza`)),
      attrezzature: emptyToNull(field(formData, `richieste.${i}.attrezzature`)),
      ordine: i,
    }))
    .filter((r) => r.tipo && (r.frequenza || r.attrezzature));

  await prisma.sopralluogo.create({
    data: {
      effettuatoDaId: session.userId,
      richiestaTipo: d.richiestaTipo,
      richiestaData: toDate(d.richiestaData),
      clienteNome: emptyToNull(d.clienteNome),
      clienteIndirizzo: emptyToNull(d.clienteIndirizzo),
      clienteCap: emptyToNull(d.clienteCap),
      clienteCitta: emptyToNull(d.clienteCitta),
      clienteTelefono: emptyToNull(d.clienteTelefono),
      clienteEmail: emptyToNull(d.clienteEmail),
      clientePec: emptyToNull(d.clientePec),
      clientePartitaIva: emptyToNull(d.clientePartitaIva),
      clienteCodiceUnivoco: emptyToNull(d.clienteCodiceUnivoco),
      luogoIndirizzo: emptyToNull(d.luogoIndirizzo),
      luogoCitta: emptyToNull(d.luogoCitta),
      referenteNome: emptyToNull(d.referenteNome),
      referenteCellulare: emptyToNull(d.referenteCellulare),
      referenteEmail: emptyToNull(d.referenteEmail),
      contenutiCapitolati: formData.get("contenutiCapitolati") === "on",
      contenutiPlanimetrie: formData.get("contenutiPlanimetrie") === "on",
      contenutiAltro: emptyToNull(d.contenutiAltro),
      note: emptyToNull(d.note),
      tipologiaLavoro: emptyToNull(d.tipologiaLavoro),
      dataSopralluogo: toDate(d.dataSopralluogo),
      mqComplessivi: toFloat(field(formData, "mqComplessivi")),
      numDipendenti: toInt(field(formData, "numDipendenti")),
      numPostazioni: toInt(field(formData, "numPostazioni")),
      numeroAmbienti: toInt(field(formData, "numeroAmbienti")),
      ambienti: { create: ambienti },
      richieste: { create: richieste },
    },
  });

  await notifyAdmins(`${session.name} ha compilato un sopralluogo`, "/admin/sopralluoghi");

  revalidatePath("/admin/sopralluoghi");
  return { success: true as const };
}

export async function deleteSopralluogo(id: string) {
  await requireModule("sopralluoghi");
  await prisma.sopralluogo.delete({ where: { id } });
  revalidatePath("/admin/sopralluoghi");
}
