import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { requireModule } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { buildLineItem } from "@/lib/quotePrint";
import {
  getServiceTypeLabels,
  getServiceTypeMostraCadenza,
} from "@/lib/serviceTypeLabels";
import { getBankSettings, formatBancaAppoggio } from "@/lib/bankSettings";
import { launchBrowser } from "@/lib/pdf/browser";
import {
  ALIQUOTA_IVA,
  CONDIZIONI_PAGAMENTO_DEFAULT,
  VALIDITA_GIORNI,
  formatEuro,
} from "@/lib/pdf/stampaConstants";
import { buildHeaderTemplate, buildFooterTemplate } from "@/lib/pdf/templates";

export const runtime = "nodejs";
export const maxDuration = 60;

const MARGIN_TOP_MM = 78;
const MARGIN_BOTTOM_MM = 59;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireModule("preventivi");
  const { id } = await params;

  const [quote, serviceLabels, mostraCadenzaSettings, bankSettings] =
    await Promise.all([
      prisma.quote.findUnique({
        where: { id },
        include: { site: { include: { client: true } } },
      }),
      getServiceTypeLabels(),
      getServiceTypeMostraCadenza(),
      getBankSettings(),
    ]);
  if (!quote) {
    return NextResponse.json(
      { error: "Preventivo non trovato" },
      { status: 404 }
    );
  }

  const client = quote.site.client;
  const clientName =
    client.tipo === "PERSONA_FISICA"
      ? `${client.nome ?? ""} ${client.cognome ?? ""}`.trim()
      : (client.ragioneSociale ?? client.name);
  const isPersonaFisica = client.tipo === "PERSONA_FISICA";

  const lineItem = buildLineItem(quote, serviceLabels[quote.serviceType]);
  const prezzoNetto = quote.prezzoVenduto ?? lineItem.listPrice;
  const totaleIva = isPersonaFisica ? prezzoNetto * ALIQUOTA_IVA : 0;
  const totaleConIva = prezzoNetto + totaleIva;

  const dataDocumento = new Date().toLocaleDateString("it-IT");
  const scadenza = new Date();
  scadenza.setDate(scadenza.getDate() + VALIDITA_GIORNI);
  const dataScadenza = scadenza.toLocaleDateString("it-IT");

  const origin = req.nextUrl.origin;

  const headerTemplate = await buildHeaderTemplate(
    {
      numeroOfferta: quote.numeroOfferta,
      dataDocumento,
      clientName,
      indirizzo: client.indirizzo,
      cap: client.cap,
      citta: client.citta,
      provincia: client.provincia,
      codiceCliente: String(client.codiceCliente).padStart(6, "0"),
      partitaIva: client.partitaIva,
      codiceFiscale: client.codiceFiscale,
      personaRiferimento: client.personaRiferimento,
      condizioniPagamento:
        quote.condizioniPagamento ?? CONDIZIONI_PAGAMENTO_DEFAULT,
      bancaAppoggio: formatBancaAppoggio(bankSettings),
    },
    origin
  );

  const buildFooter = (totaleLabel: string) =>
    buildFooterTemplate({
      dataScadenza,
      totaleLabel,
      isPersonaFisica,
      totaleIva,
      totaleConIva,
    });

  const sessionCookie = req.cookies.get("session");
  const baseUrl = `${origin}/admin/preventivi/${id}/stampa?pdf=1`;

  const browser = await launchBrowser();

  try {
    const renderPdf = async (totaleLabel: string): Promise<Uint8Array> => {
      const page = await browser.newPage();
      if (sessionCookie) {
        await page.setCookie({
          name: "session",
          value: sessionCookie.value,
          url: origin,
        });
      }
      const url = `${baseUrl}&totale=${encodeURIComponent(totaleLabel)}`;
      await page.goto(url, { waitUntil: "networkidle0" });
      const buf = await page.pdf({
        format: "A4",
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate,
        footerTemplate: buildFooter(totaleLabel),
        margin: {
          top: `${MARGIN_TOP_MM}mm`,
          bottom: `${MARGIN_BOTTOM_MM}mm`,
          left: "6mm",
          right: "6mm",
        },
      });
      await page.close();
      return buf;
    };

    // The description table is a single continuous <table> and the browser
    // decides on its own where to break it across physical pages (repeating
    // the <thead> automatically) — so how many pages there will be is only
    // known after actually rendering, never estimated in advance. Render
    // once with "SEGUE" as the footer total, check the real page count, and
    // only render+merge the "real total" version if there's more than one:
    // all-but-last page keep "SEGUE", the last one gets the real total.
    const segueBuf = await renderPdf("SEGUE");
    const segueDoc = await PDFDocument.load(segueBuf);
    const totalPages = segueDoc.getPageCount();

    let finalBuf: Uint8Array;
    if (totalPages <= 1) {
      finalBuf = await renderPdf(formatEuro(prezzoNetto));
    } else {
      const realBuf = await renderPdf(formatEuro(prezzoNetto));
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
        "Cache-Control": "no-store",
      },
    });
  } finally {
    await browser.close();
  }
}
