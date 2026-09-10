import { NextRequest, NextResponse } from "next/server";
import { requireModule } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireModule("preventivi");
  const { id } = await params;

  const attachment = await prisma.attachment.findUnique({ where: { id } });
  if (!attachment) {
    return NextResponse.json({ error: "Allegato non trovato" }, { status: 404 });
  }

  return new NextResponse(Buffer.from(attachment.data), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `inline; filename="${attachment.fileName}"`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
