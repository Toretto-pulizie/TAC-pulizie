"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/dal";
import { ALLOWED_ATTACHMENT_MIME_TYPES, type AllowedAttachmentMimeType } from "@/lib/attachments";

const MAX_SIZE_BYTES = 15 * 1024 * 1024;

export async function createAttachment(_prevState: unknown, formData: FormData) {
  await requireAdmin();

  const nome = formData.get("nome")?.toString().trim();
  const file = formData.get("file");

  if (!nome) return { error: "Il nome non può essere vuoto" };
  if (!(file instanceof File) || file.size === 0)
    return { error: "Seleziona un file" };
  if (!ALLOWED_ATTACHMENT_MIME_TYPES.includes(file.type as AllowedAttachmentMimeType))
    return { error: "Sono ammessi solo file PDF, PNG o JPG" };
  if (file.size > MAX_SIZE_BYTES)
    return { error: "Il file supera la dimensione massima di 15 MB" };

  const data = Buffer.from(await file.arrayBuffer());

  await prisma.attachment.create({
    data: { nome, fileName: file.name, mimeType: file.type, data },
  });

  revalidatePath("/admin/impostazioni");
  revalidatePath("/admin/preventivi");
  return { success: true };
}

export async function deleteAttachment(id: string) {
  await requireAdmin();

  const usageCount = await prisma.quoteAttachment.count({
    where: { attachmentId: id },
  });
  if (usageCount > 0) {
    return {
      error: `Impossibile eliminare: è allegato a ${usageCount} preventivo/i.`,
    };
  }

  await prisma.attachment.delete({ where: { id } });
  revalidatePath("/admin/impostazioni");
  revalidatePath("/admin/preventivi");
  return { success: true };
}
