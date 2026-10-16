import nodemailer from "nodemailer";

// Invio email tramite SMTP. Le credenziali NON stanno nel codice né nel database:
// si impostano come variabili d'ambiente (su Vercel: Settings → Environment
// Variables; in locale: file .env).
//   SMTP_HOST   server di posta in uscita (es. smtps.aruba.it)
//   SMTP_PORT   porta (587 STARTTLS, 465 SSL); predefinita 587
//   SMTP_USER   utente (di solito l'indirizzo email completo)
//   SMTP_PASS   password della casella
//   SMTP_FROM   mittente mostrato (es. "Toretto <info@toret-to.it>"); se assente SMTP_USER
//   SMTP_SECURE "true" per forzare SSL (impostato da solo con la porta 465)
export type MailConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  secure: boolean;
};

export function getMailConfig(): MailConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  const port = Number(process.env.SMTP_PORT) || 587;
  return {
    host,
    port,
    user,
    pass,
    from: process.env.SMTP_FROM?.trim() || user,
    secure: port === 465 || process.env.SMTP_SECURE === "true",
  };
}

export function isMailConfigured() {
  return getMailConfig() !== null;
}

export async function sendMail(opts: {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text: string;
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
}) {
  const cfg = getMailConfig();
  if (!cfg) {
    throw new Error(
      "La posta non è configurata: mancano le variabili SMTP_HOST, SMTP_USER e SMTP_PASS su Vercel."
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
