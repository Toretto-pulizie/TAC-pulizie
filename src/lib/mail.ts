import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/secretBox";

// Invio email tramite SMTP. I dati si inseriscono in Impostazioni → Email
// (password salvata cifrata nel database). In alternativa, se esistono le
// variabili d'ambiente SMTP_HOST, SMTP_USER e SMTP_PASS (più SMTP_PORT,
// SMTP_FROM, SMTP_SECURE), quelle hanno la precedenza.
export type MailConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  secure: boolean;
  origine: "ambiente" | "impostazioni";
};

// Mittente completo da usare nell'intestazione "Da". Il campo può contenere:
//  - niente  → solo l'indirizzo dell'utente SMTP;
//  - un indirizzo o "Nome <indirizzo>" → usato così com'è;
//  - solo un nome (es. "Toretto - Impresa di pulizie") → "Nome" <indirizzo dell'utente>.
// Senza un indirizzo valido nell'intestazione i messaggi vengono scartati o finiscono
// nello spam, anche se il server di posta li ha accettati.
export function buildFrom(from: string | null | undefined, user: string): string {
  const f = (from ?? "").trim();
  if (!f) return user;
  if (f.includes("@")) return f;
  return `"${f.replace(/["\\<>]/g, "")}" <${user}>`;
}

export async function getMailConfig(): Promise<MailConfig | null> {
  const eHost = process.env.SMTP_HOST?.trim();
  const eUser = process.env.SMTP_USER?.trim();
  const ePass = process.env.SMTP_PASS;
  if (eHost && eUser && ePass) {
    const port = Number(process.env.SMTP_PORT) || 587;
    return {
      host: eHost,
      port,
      user: eUser,
      pass: ePass,
      from: buildFrom(process.env.SMTP_FROM, eUser),
      secure: port === 465 || process.env.SMTP_SECURE === "true",
      origine: "ambiente",
    };
  }

  const s = await prisma.emailSettings.findUnique({ where: { id: "singleton" } });
  if (!s || !s.smtpHost.trim() || !s.smtpUser.trim()) return null;
  const pass = decryptSecret(s.smtpPassCifrata);
  if (!pass) return null;
  const port = s.smtpPort || 465;
  return {
    host: s.smtpHost.trim(),
    port,
    user: s.smtpUser.trim(),
    pass,
    from: buildFrom(s.smtpFrom, s.smtpUser.trim()),
    // 465 = SSL diretto; 587 e le altre usano STARTTLS.
    secure: port === 465,
    origine: "impostazioni",
  };
}

export async function isMailConfigured() {
  return (await getMailConfig()) !== null;
}

export async function sendMail(opts: {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text: string;
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
}) {
  const cfg = await getMailConfig();
  if (!cfg) {
    throw new Error(
      "La posta non è configurata: inserisci server, utente e password in Impostazioni → Email."
    );
  }
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
    // Evita richieste appese che consumerebbero tempo di esecuzione.
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  });
  return transporter.sendMail({
    from: cfg.from,
    replyTo: cfg.from,
    to: opts.to,
    cc: opts.cc && opts.cc.length > 0 ? opts.cc : undefined,
    bcc: opts.bcc && opts.bcc.length > 0 ? opts.bcc : undefined,
    subject: opts.subject,
    text: opts.text,
    attachments: opts.attachments,
  });
}
