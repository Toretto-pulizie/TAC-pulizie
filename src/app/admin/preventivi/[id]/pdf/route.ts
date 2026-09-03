import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { requireModule } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import {
  buildCadenzaLine,
  buildDescriptionBlocks,
  buildDescriptionLines,
  buildLineItem,
  buildNoteParagraphs,
} from "@/lib/quotePrint";
import { getServiceTypeLabels } from "@/lib/serviceTypeLabels";
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

// Rather than letting the browser split one long table across pages (it
// won't repeat the table's own rounded-corner border at the artificial cut
// point — a real Chromium print limitation), we measure how tall each
// description paragraph renders and split the content ourselves into
// separate, complete <table> elements, one per physical page — the same
// approach a report tool like Crystal Reports uses. Each page's table is
// then a genuine, independently-bordered box; nothing needs to be patched
// in afterwards.
const MM_TO_PX = 96 / 25.4;
const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const PAGE_MARGIN_LEFT_MM = 6;
const PAGE_MARGIN_RIGHT_MM = 6;
// Measured via getBoundingClientRect on the actual rendered templates
// (header ~72.7mm, footer ~53.9mm at the real print width) plus a 5mm
// breathing-room gap to the description table / footer box.
const MARGIN_TOP_MM = 78;
const MARGIN_BOTTOM_MM = 59;
const VIEWPORT_WIDTH_PX = Math.round(
  (PAGE_WIDTH_MM - PAGE_MARGIN_LEFT_MM - PAGE_MARGIN_RIGHT_MM) * MM_TO_PX
);
const CONTENT_HEIGHT_PER_PAGE_PX =
  (PAGE_HEIGHT_MM - MARGIN_TOP_MM - MARGIN_BOTTOM_MM) * MM_TO_PX;

type Measurements = {
  blockHeights: number[];
  theadHeight: number;
  summaryHeight: number;
  bodyCellOverhead: number;
};

function bucketBlocks(m: Measurements): number[][] {
  const pageCapacity =
    CONTENT_HEIGHT_PER_PAGE_PX - m.theadHeight - m.bodyCellOverhead;

  const groups: number[][] = [];
  let current: number[] = [];
  let currentHeight = 0;

  m.blockHeights.forEach((h, i) => {
    if (current.length > 0 && currentHeight + h > pageCapacity) {
      groups.push(current);
      current = [];
      currentHeight = 0;
    }
    current.push(i);
    currentHeight += h;
  });
  groups.push(current);

  const lastGroup = groups[groups.length - 1];
  const lastGroupHeight = lastGroup.reduce(
    (sum, i) => sum + m.blockHeights[i],
    0
  );
  if (lastGroupHeight + m.summaryHeight > pageCapacity) {
    groups.push([]);
  }

  return groups;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireModule("preventivi");
  const { id } = await params;

  const [quote, serviceLabels, bankSettings] = await Promise.all([
    prisma.quote.findUnique({
      where: { id },
      include: { site: { include: { client: true } } },
    }),
    getServiceTypeLabels(),
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

  const descriptionLines = buildDescriptionLines(quote);
  const cadenzaLine = buildCadenzaLine(quote);
  const noteParagraphs = buildNoteParagraphs(quote.note);
  const blocks = buildDescriptionBlocks(
    quote,
    descriptionLines,
    cadenzaLine,
    noteParagraphs
  );

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
    const newPage = async () => {
      const page = await browser.newPage();
      if (sessionCookie) {
        await page.setCookie({
          name: "session",
          value: sessionCookie.value,
          url: origin,
        });
      }
      return page;
    };

    // Measurement pass: load the ungrouped (single-table) rendering and
    // read back the actual rendered height of every paginatable unit, at
    // the same width the print content box will use.
    const measurePage = await newPage();
    await measurePage.setViewport({
      width: VIEWPORT_WIDTH_PX,
      height: 2000,
    });
    await measurePage.goto(baseUrl, { waitUntil: "networkidle0" });
    const measurements: Measurements = await measurePage.evaluate(() => {
      const blockEls = Array.from(
        document.querySelectorAll("[data-block-index]")
      );
      const blockHeights = blockEls
        .sort(
          (a, b) =>
            Number(a.getAttribute("data-block-index")) -
            Number(b.getAttribute("data-block-index"))
        )
        .map((el) => el.getBoundingClientRect().height);
      const theadEl = document.querySelector('[data-block="thead"]');
      const summaryEl = document.querySelector('[data-block="summary"]');
      const bodyCellEl = document.querySelector('[data-block="body-cell"]');
      const bodyCellHeight = bodyCellEl
        ? bodyCellEl.getBoundingClientRect().height
        : 0;
      const sumBlockHeights = blockHeights.reduce((a, b) => a + b, 0);
      return {
        blockHeights,
        theadHeight: theadEl ? theadEl.getBoundingClientRect().height : 0,
        summaryHeight: summaryEl
          ? summaryEl.getBoundingClientRect().height
          : 0,
        bodyCellOverhead: bodyCellHeight - sumBlockHeights,
      };
    });
    await measurePage.close();

    const groups = bucketBlocks(measurements);
    const groupsParam = groups.map((g) => g.join(",")).join("|");
    const totalPages = groups.length;

    const renderPdf = async (totaleLabel: string): Promise<Uint8Array> => {
      const page = await newPage();
      const url = `${baseUrl}&groups=${encodeURIComponent(groupsParam)}&totale=${encodeURIComponent(totaleLabel)}`;
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

    let finalBuf: Uint8Array;
    if (totalPages <= 1) {
      finalBuf = await renderPdf(formatEuro(prezzoNetto));
    } else {
      const segueBuf = await renderPdf("SEGUE");
      const realBuf = await renderPdf(formatEuro(prezzoNetto));
      const segueDoc = await PDFDocument.load(segueBuf);
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
