import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// Cifratura simmetrica (AES-256-GCM) per segreti salvati nel database, come la
// password della casella di posta. La chiave deriva da SESSION_SECRET: chi legge
// solo il database non vede la password in chiaro. Se SESSION_SECRET cambia, i
// segreti salvati non sono più leggibili e vanno reinseriti.
function key(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET non impostata: impossibile cifrare");
  return createHash("sha256").update(`toretto-segreti:${secret}`).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

// Restituisce null se il valore è vuoto o non decifrabile (chiave cambiata).
export function decryptSecret(stored: string): string | null {
  if (!stored) return null;
  try {
    const raw = Buffer.from(stored, "base64");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const enc = raw.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
