"use server";

import * as z from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAdmin, requireModule } from "@/lib/dal";
import { sendMail, getMailConfig } from "@/lib/mail";
import { encryptSecret } from "@/lib/secretBox";
import { clientDisplayName } from "@/lib/clients";

const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

// Accetta più indirizzi separati da virgola, punto e virgola o spazio.
function parseEmails(raw: FormDataEntryValue | null): string[] {
  return String(raw ?? "")
    .split(/[;,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const SendSchema = z.object({
  quoteId: z.string().min(1),
  to: z.array(z.string().regex(EMAIL_RE, "Indirizzo non valido")).min(1, "Indica almeno un destinatario"),
  cc: z.array(z.string().regex(EMAIL_RE, "Indirizzo in copia non valido")),
  subject: z.string().trim().min(1, "L'oggetto non può essere vuoto"),
  body: z.string().trim().min(1, "Il messaggio non può essere vuoto"),
});

// Allegati esterni: Vercel accetta circa 4,5 MB per richiesta, quindi il totale
// dei file è limitato a 4 MB. Si bloccano i tipi eseguibili, che i provider di
// posta comunque rifiuterebbero.
const MAX_EXTERNAL_TOTAL = 4 * 1024 * 1024;
const MAX_EXTERNAL_FILES = 8;
const BLOCKED_EXTENSIONS = /\.(exe|bat|cmd|com|scr|msi|js|jse|vbs|vbe|wsf|ps1|jar|dll|lnk|reg)$/i;

function formatFileSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function validateExternalFiles(files: File[]): string | null {
  if (files.length > MAX_EXTERNAL_FILES) {
    return `Puoi aggiungere al massimo ${MAX_EXTERNAL_FILES} file.`;
  }
  const blocked = files.find((f) => BLOCKED_EXTENSIONS.test(f.name));
  if (blocked) return `Il file "${blocked.name}" non può essere allegato (tipo non consentito).`;
  const totale = files.reduce((s, f) => s + f.size, 0);
  if (totale > MAX_EXTERNAL_TOTAL) {
    return `I file aggiunti pesano ${formatFileSize(totale)}: il massimo è 4 MB in totale. Riduci o comprimi i file.`;
  }
  return null;
}

// Genera il PDF dell'offerta (con gli allegati) chiamando la stessa route che usa
// il pulsante Stampa, con la sessione di chi invia: un unico punto di verità per
// il contenuto del documento.
async function fetchQuotePdf(quoteId: string): Promise<Buffer> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) throw new Error("Indirizzo del programma non riconosciuto");
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const res = await fetch(`${proto}://${host}/admin/preventivi/${quoteId}/pdf`, {
    headers: { cookie: h.get("cookie") ?? "" },
    cache: "no-store",
  });
  if (!res.ok || !res.headers.get("content-type")?.includes("application/pdf")) {
    throw new Error(`Impossibile generare il PDF dell'offerta (errore ${res.status})`);
  }
  return Buffer.from(await res.arrayBuffer());
}

export async function sendQuoteEmail(_prevState: unknown, formData: FormData) {
  await requireModule("preventivi");

  const parsed = SendSchema.safeParse({
    quoteId: formData.get("quoteId"),
    to: parseEmails(formData.get("to")),
    cc: parseEmails(formData.get("cc")),
    subject: formData.get("subject"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const { quoteId, to, cc, subject, body } = parsed.data;

  // Allegati esterni: file scelti dal PC per quest'unico invio (non archiviati).
  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0);
  const fileError = validateExternalFiles(files);
  if (fileError) return { error: fileError };

  if (!(await getMailConfig())) {
    return {
      error:
        "La posta non è ancora configurata: inserisci server, utente e password in Impostazioni → Email.",
    };
  }

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    select: { numeroOfferta: true, client: true },
  });
  if (!quote) return { error: "Offerta non trovata" };

  const settings = await prisma.emailSettings.findUnique({ where: { id: "singleton" } });
  const ccn = settings?.ccnIndirizzo.trim();
  const bcc = ccn && EMAIL_RE.test(ccn) ? [ccn] : [];
  const user = await getCurrentUser();

  const log = (esito: "INVIATA" | "ERRORE", errore?: string) =>
    prisma.quoteEmailLog.create({
      data: {
        quoteId,
        destinatari: to.join(", "),
        cc: cc.join(", "),
        oggetto: subject,
        esito,
        errore: errore ?? null,
        inviatoDa: user?.name ?? null,
        allegatiEsterni: files.map((f) => `${f.name} (${formatFileSize(f.size)})`).join("; "),
      },
    });

  try {
    const pdf = await fetchQuotePdf(quoteId);
    const esterni = await Promise.all(
      files.map(async (f) => ({
        filename: f.name.replace(/[\\/:*?"<>|]+/g, "_"),
        content: Buffer.from(await f.arrayBuffer()),
        contentType: f.type || undefined,
      }))
    );
    const nomeFile = `Offerta n. ${quote.numeroOfferta} - ${clientDisplayName(quote.client)}`
      .replace(/[\\/:*?"<>|]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    await sendMail({
      to,
      cc,
      bcc,
      subject,
      text: body,
      attachments: [
        { filename: `${nomeFile}.pdf`, content: pdf, contentType: "application/pdf" },
        ...esterni,
      ],
    });
    await log("INVIATA");
    revalidatePath("/admin/preventivi");
    return {
      success: true,
      message: `Offerta inviata a ${to.join(", ")}${
        esterni.length > 0 ? ` con ${esterni.length} allegat${esterni.length === 1 ? "o" : "i"} in più` : ""
      }.`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore sconosciuto";
    await log("ERRORE", msg);
    revalidatePath("/admin/preventivi");
    return { error: `Invio non riuscito: ${msg}` };
  }
}

const EmailSettingsSchema = z.object({
  oggetto: z.string().trim(),
  corpo: z.string().trim(),
  ccnIndirizzo: z
    .string()
    .trim()
    .refine((v) => v === "" || EMAIL_RE.test(v), "Indirizzo per la copia nascosta non valido"),
  smtpHost: z.string().trim(),
  smtpPort: z.coerce.number().int().min(1, "Porta non valida").max(65535, "Porta non valida"),
  smtpUser: z.string().trim(),
  smtpFrom: z.string().trim(),
});

export async function updateEmailSettings(_prevState: unknown, formData: FormData) {
  await requireAdmin();
  const parsed = EmailSettingsSchema.safeParse({
    oggetto: formData.get("oggetto"),
    corpo: formData.get("corpo"),
    ccnIndirizzo: formData.get("ccnIndirizzo") ?? "",
    smtpHost: formData.get("smtpHost") ?? "",
    smtpPort: formData.get("smtpPort") || 465,
    smtpUser: formData.get("smtpUser") ?? "",
    smtpFrom: formData.get("smtpFrom") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  // Password: solo in scrittura. Se il campo è vuoto resta quella già salvata;
  // se compilato viene cifrata. Non viene mai restituita al browser.
  const nuovaPassword = String(formData.get("smtpPass") ?? "");
  let smtpPassCifrata: string | undefined;
  if (nuovaPassword) {
    try {
      smtpPassCifrata = encryptSecret(nuovaPassword);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Impossibile salvare la password" };
    }
  }
  await prisma.emailSettings.upsert({
    where: { id: "singleton" },
    update: { ...parsed.data, ...(smtpPassCifrata ? { smtpPassCifrata } : {}) },
    create: { id: "singleton", ...parsed.data, smtpPassCifrata: smtpPassCifrata ?? "" },
  });
  revalidatePath("/admin/impostazioni");
  revalidatePath("/admin/preventivi");
  return { success: true };
}

// Invia un messaggio di prova per controllare subito che i dati SMTP siano giusti.
export async function sendTestEmail(_prevState: unknown, formData: FormData) {
  await requireAdmin();
  const to = String(formData.get("testTo") ?? "").trim();
  if (!EMAIL_RE.test(to)) return { error: "Indica un indirizzo email valido per la prova" };
  try {
    const cfg = await getMailConfig();
    if (!cfg) {
      return { error: "Prima salva server, utente e password, poi invia la prova." };
    }
    await sendMail({
      to: [to],
      subject: "Prova invio email — Toretto",
      text: `Questo è un messaggio di prova inviato dal programma Toretto.\n\nSe lo ricevi, l'invio delle offerte via email funziona.\nMittente configurato: ${cfg.from}`,
    });
    return { success: true, message: `Email di prova inviata a ${to}. Controlla la posta (anche lo spam).` };
  } catch (e) {
    return { error: `Invio non riuscito: ${e instanceof Error ? e.message : "errore sconosciuto"}` };
  }
}
