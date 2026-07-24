import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { buildLineItem } from "@/lib/quotePrint";
import { getServiceTypeLabels } from "@/lib/serviceTypeLabels";
import { launchBrowser } from "@/lib/pdf/browser";
import { formatEuro } from "@/lib/pdf/stampaConstants";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin();
  const { id } = await params;

  const [quote, serviceLabels] = await Promise.all([
    prisma.quote.findUnique({
      where: { id },
      include: { site: { include: { client: true } } },
    }),
    getServiceTypeLabels(),
  ]);
  if (!quote) {
    return NextResponse.json(
      { error: "Preventivo non trovato" },
      { status: 404 }
    );
  }

  const lineItem = buildLineItem(quote, serviceLabels[quote.serviceType]);
  const prezzoNetto = quote.prezzoVenduto ?? lineItem.listPrice;

  const sessionCookie = req.cookies.get("session");
  const origin = req.nextUrl.origin;
  const baseUrl = `${origin}/admin/preventivi/${id}/stampa?pdf=1`;

  const browser = await launchBrowser();

  try {
    const renderPdf = async (totaleParam?: string): Promise<Uint8Array> => {
      const page = await browser.newPage();
      if (sessionCookie) {
        await page.setCookie({
          name: "session",
          value: sessionCookie.value,
          url: origin,
        });
      }
      const url = totaleParam
        ? `${baseUrl}&totale=${encodeURIComponent(totaleParam)}`
        : baseUrl;
      await page.goto(url, { waitUntil: "networkidle0" });
      const buf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "12mm", bottom: "12mm", left: "12mm", right: "12mm" },
      });
      await page.close();
      return buf;
    };

    const segueBuf = await renderPdf("SEGUE");
    const segueDoc = await PDFDocument.load(segueBuf);
    const totalPages = segueDoc.getPageCount();

    let finalBuf: Uint8Array;
    if (totalPages <= 1) {
      finalBuf = await renderPdf();
    } else {
      const realBuf = await renderPdf();
      const realDoc = await PDFDocument.load(realBuf);
      const finalDoc = await PDFDocument.create();
      const seguePages = await finalDoc.copyPages(
        segueDoc,
        Array.from({ length: totalPages - 1 }, (_, i) => i)
      );
      seguePages.forEach((p) => finalDoc.addPage(p));
      const [lastPage] = await finalDoc.copyPages(realDoc, [totalPages - 1]);
      finalDoc.addPage(lastPage);
      finalBuf = await finalDoc.save();
    }

    return new NextResponse(Buffer.from(finalBuf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="preventivo-${quote.numeroOfferta}.pdf"`,
      },
    });
  } finally {
    await browser.close();
  }
}
