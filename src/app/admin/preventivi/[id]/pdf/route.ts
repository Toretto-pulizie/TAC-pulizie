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
        include: {
          client: true,
          sites: true,
          attachments: { include: { attachment: true }, orderBy: { ordine: "asc" } },
        },
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

  const client = quote.client;
  const clientName =
    client.tipo === "PERSONA_FISICA"
      ? `${client.cognome ?? ""} ${client.nome ?? ""}`.trim()
      : (client.ragioneSociale ?? client.name);
  const isPersonaFisica = client.tipo === "PERSONA_FISICA";

  // Somma su tutte le sedi: ognuna ha il proprio Netto/Adeguamento indipendente.
  const prezzoNetto = quote.sites.reduce((sum, qs) => {
    const lineItem = buildLineItem(qs, serviceLabels[qs.serviceType]);
    return sum + (qs.adeguamento ?? qs.prezzoVenduto ?? lineItem.listPrice);
  }, 0);
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

    let finalDoc: PDFDocument;
    if (totalPages <= 1) {
      const realBuf = await renderPdf(formatEuro(prezzoNetto));
      finalDoc = await PDFDocument.load(realBuf);
    } else {
      const realBuf = await renderPdf(formatEuro(prezzoNetto));
      const realDoc = await PDFDocument.load(realBuf);
      finalDoc = await PDFDocument.create();
      const seguePages = await finalDoc.copyPages(
        segueDoc,
        Array.from({ length: totalPages - 1 }, (_, i) => i)
      );
      seguePages.forEach((p) => finalDoc.addPage(p));
      const [lastPage] = await finalDoc.copyPages(realDoc, [totalPages - 1]);
      finalDoc.addPage(lastPage);
    }

    // Allegati (PDF/PNG/JPG caricati in Impostazioni, es. clausole
    // contrattuali): vengono accodati così come sono stati creati, senza
    // rielaborarne il contenuto — restano "a parte" rispetto al preventivo.
    // Un PDF viene copiato pagina per pagina; un'immagine diventa una
    // singola pagina a sé, dimensionata sull'immagine stessa.
    for (const qa of quote.attachments) {
      const { mimeType, data } = qa.attachment;
      if (mimeType === "application/pdf") {
        const attachmentDoc = await PDFDocument.load(data);
        const pages = await finalDoc.copyPages(
          attachmentDoc,
          attachmentDoc.getPageIndices()
        );
        pages.forEach((p) => finalDoc.addPage(p));
      } else {
        const image =
          mimeType === "image/png"
            ? await finalDoc.embedPng(data)
            : await finalDoc.embedJpg(data);
        const page = finalDoc.addPage([image.width, image.height]);
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: image.width,
          height: image.height,
        });
      }
    }

    const finalBuf = await finalDoc.save();

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
