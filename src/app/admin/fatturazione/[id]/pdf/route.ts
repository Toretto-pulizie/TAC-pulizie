import { NextRequest, NextResponse } from "next/server";
import { requireModule } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { clientDisplayName } from "@/lib/clients";
import { getBankSettings, formatBancaAppoggio } from "@/lib/bankSettings";
import { launchBrowser } from "@/lib/pdf/browser";
import { buildHeaderTemplate, buildFatturaFooterTemplate } from "@/lib/pdf/templates";
import { ALIQUOTA_IVA, CONDIZIONI_PAGAMENTO_DEFAULT, formatEuro } from "@/lib/pdf/stampaConstants";

export const runtime = "nodejs";
export const maxDuration = 60;

// Il footer della Fattura è molto più corto di quello dei Preventivi (niente
// clausola di accettazione/validità): meno margine inferiore riservato.
const MARGIN_TOP_MM = 78;
const MARGIN_BOTTOM_MM = 34;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireModule("fatturazione");
  const { id } = await params;

  const [invoice, bankSettings] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: { client: true, righe: { orderBy: { ordine: "asc" } } },
    }),
    getBankSettings(),
  ]);
  if (!invoice) {
    return NextResponse.json({ error: "Fattura non trovata" }, { status: 404 });
  }

  const client = invoice.client;
  const clientName = clientDisplayName(client);
  const numeroLabel = invoice.numero != null ? `${invoice.numero}/${invoice.anno}` : "BOZZA";
  const isCreditNote = invoice.tipoDocumento === "TD04";

  const imponibile = invoice.righe.reduce((sum, r) => sum + r.importo, 0);
  const isStandard = invoice.regimeIva === "STANDARD";
  const totaleIva = isStandard ? imponibile * ALIQUOTA_IVA : 0;
  const totaleConIva = imponibile + totaleIva;

  const origin = req.nextUrl.origin;

  const headerTemplate = await buildHeaderTemplate(
    {
      numeroOfferta: numeroLabel,
      dataDocumento: invoice.data.toLocaleDateString("it-IT"),
      clientName,
      indirizzo: client.indirizzo,
      cap: client.cap,
      citta: client.citta,
      provincia: client.provincia,
      codiceCliente: client.codiceCliente != null ? String(client.codiceCliente).padStart(6, "0") : "—",
      partitaIva: client.partitaIva,
      codiceFiscale: client.codiceFiscale,
      personaRiferimento: client.personaRiferimento,
      condizioniPagamento: invoice.condizioniPagamento ?? CONDIZIONI_PAGAMENTO_DEFAULT,
      bancaAppoggio: formatBancaAppoggio(bankSettings),
      docLabel: isCreditNote ? "Nota di credito" : "Fattura",
    },
    origin
  );

  const footerTemplate = buildFatturaFooterTemplate({
    totaleLabel: formatEuro(imponibile),
    isStandardIva: isStandard,
    totaleIva,
    totaleConIva,
  });

  const sessionCookie = req.cookies.get("session");
  const url = `${origin}/admin/fatturazione/${id}/stampa?pdf=1`;

  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    if (sessionCookie) {
      await page.setCookie({ name: "session", value: sessionCookie.value, url: origin });
    }
    await page.goto(url, { waitUntil: "networkidle0" });
    const buf = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate,
      footerTemplate,
      margin: {
        top: `${MARGIN_TOP_MM}mm`,
        bottom: `${MARGIN_BOTTOM_MM}mm`,
        left: "6mm",
        right: "6mm",
      },
    });
    await page.close();

    return new NextResponse(Buffer.from(buf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${isCreditNote ? "NOTA DI CREDITO" : "FATTURA"} ${numeroLabel.replace("/", "-")}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } finally {
    await browser.close();
  }
}
