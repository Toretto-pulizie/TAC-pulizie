import { prisma } from "@/lib/prisma";

// Testo predefinito delle email di invio offerta. Segnaposto: {cliente},
// {numero}, {data}. Modificabile in Impostazioni → Email.
export const DEFAULT_EMAIL_OGGETTO = "Offerta n. {numero} — Toretto";
export const DEFAULT_EMAIL_CORPO = [
  "Gentile {cliente},",
  "",
  "in allegato trova la nostra offerta n. {numero} del {data}.",
  "",
  "Restiamo a disposizione per qualsiasi chiarimento.",
  "",
  "Cordiali saluti",
  "Toretto di Tavernese Enrico",
].join("\n");

export async function getEmailSettings() {
  const s = await prisma.emailSettings.findUnique({ where: { id: "singleton" } });
  return {
    oggetto: s?.oggetto.trim() ? s.oggetto : DEFAULT_EMAIL_OGGETTO,
    corpo: s?.corpo.trim() ? s.corpo : DEFAULT_EMAIL_CORPO,
    ccnIndirizzo: s?.ccnIndirizzo ?? "",
  };
}

export function applyEmailTemplate(
  template: string,
  values: { cliente: string; numero: number | string; data: string }
) {
  return template
    .replaceAll("{cliente}", values.cliente)
    .replaceAll("{numero}", String(values.numero))
    .replaceAll("{data}", values.data);
}
