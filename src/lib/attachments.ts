// PDF e immagini sono gli unici formati che si possono accodare al PDF del
// preventivo mantenendo la formattazione originale (le pagine PDF si
// copiano così come sono, le immagini diventano una pagina a sé stante).
// Altri formati (Word, Excel, ecc.) non sono supportati: convertirli in PDF
// al volo richiederebbe strumenti non disponibili in questo ambiente.
export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
] as const;

export type AllowedAttachmentMimeType =
  (typeof ALLOWED_ATTACHMENT_MIME_TYPES)[number];
