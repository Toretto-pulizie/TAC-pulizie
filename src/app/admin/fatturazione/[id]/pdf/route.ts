import { NextRequest, NextResponse } from "next/server";
import { requireModule } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { clientDisplayName } from "@/lib/clients";
import { getCompanySettings, companyDisplayName } from "@/lib/companySettings";
import { launchBrowser } from "@/lib/pdf/browser";
import { getLogoDataUri } from "@/lib/pdf/templates";
import {
  NOTA_REVERSE_CHARGE,
  NOTA_IVA_PRIVATI,
  ALIQUOTA_IVA,
  SITE_LINE,
  formatEuro,
} from "@/lib/pdf/stampaConstants";

export const runtime = "nodejs";
export const maxDuration = 60;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireModule("fatturazione");
  const { id } = await params;

  const [invoice, company] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: { client: true, righe: { orderBy: { ordine: "asc" } } },
    }),
    getCompanySettings(),
  ]);
  if (!invoice) {
    return NextResponse.json({ error: "Fattura non trovata" }, { status: 404 });
  }

  const client = invoice.client;
  const clientName = clientDisplayName(client);
  const clientCittaLine = [client.cap, client.citta].filter(Boolean).join(" ");
  const clientCittaProvincia = client.provincia ? `${clientCittaLine} (${client.provincia})` : clientCittaLine;

  const companyCittaLine = [company.cap, company.citta].filter(Boolean).join(" ");
  const companyCittaProvincia = company.provincia ? `${companyCittaLine} (${company.provincia})` : companyCittaLine;

  const imponibile = invoice.righe.reduce((sum, r) => sum + r.importo, 0);
  const isStandard = invoice.regimeIva === "STANDARD";
  const iva = isStandard ? imponibile * ALIQUOTA_IVA : 0;
  const totale = imponibile + iva;
  const numeroLabel = invoice.numero != null ? `${invoice.numero}/${invoice.anno}` : "BOZZA";

  const origin = req.nextUrl.origin;
  const logoDataUri = await getLogoDataUri(origin);

  const righeHtml = invoice.righe
    .map(
      (r) => `
      <tr>
        <td style="padding:6px 8px; border-bottom:1px solid #e4e4e7;">${escapeHtml(r.descrizione)}</td>
        <td style="padding:6px 8px; border-bottom:1px solid #e4e4e7; text-align:right;">${r.quantita}</td>
        <td style="padding:6px 8px; border-bottom:1px solid #e4e4e7; text-align:right;">${escapeHtml(formatEuro(r.prezzoUnitario))}</td>
        <td style="padding:6px 8px; border-bottom:1px solid #e4e4e7; text-align:right;">${escapeHtml(formatEuro(r.importo))}</td>
      </tr>`
    )
    .join("");

  const html = `
    <!doctype html>
    <html lang="it">
    <head><meta charset="utf-8" /></head>
    <body style="font-family:sans-serif; font-size:12px; color:#18181b; margin:0; padding:16mm;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:24px;">
        <div>
          <img src="${logoDataUri}" alt="Toretto" style="width:220px; height:auto;" />
          <p style="margin:12px 0 0; font-weight:600;">${escapeHtml(companyDisplayNameOrDash(company))}</p>
          <p style="margin:0;">${escapeHtml(company.indirizzo)}</p>
          <p style="margin:0;">${escapeHtml(companyCittaProvincia)}</p>
          <p style="margin:0;">P.IVA ${escapeHtml(company.partitaIva)} — C.F. ${escapeHtml(company.codiceFiscale)}</p>
        </div>
        <div style="text-align:right;">
          <h1 style="margin:0; font-size:20px;">FATTURA</h1>
          <p style="margin:4px 0 0;">N. ${escapeHtml(numeroLabel)}</p>
          <p style="margin:0;">Data: ${invoice.data.toLocaleDateString("it-IT")}</p>
        </div>
      </div>

      <div style="margin-top:16px; padding:10px; border:1px solid #d4d4d8; border-radius:8px;">
        <p style="margin:0; font-size:10px; text-transform:uppercase; color:#71717a;">Spett.le</p>
        <p style="margin:2px 0 0; font-weight:600;">${escapeHtml(clientName)}</p>
        ${client.indirizzo ? `<p style="margin:0;">${escapeHtml(client.indirizzo)}</p>` : ""}
        ${clientCittaProvincia ? `<p style="margin:0;">${escapeHtml(clientCittaProvincia)}</p>` : ""}
        ${client.partitaIva ? `<p style="margin:0;">P.IVA ${escapeHtml(client.partitaIva)}</p>` : ""}
        ${client.codiceFiscale ? `<p style="margin:0;">C.F. ${escapeHtml(client.codiceFiscale)}</p>` : ""}
      </div>

      <table style="width:100%; border-collapse:collapse; margin-top:16px;">
        <thead>
          <tr style="background:#fafafa;">
            <th style="padding:6px 8px; text-align:left; border-bottom:1px solid #d4d4d8;">Descrizione</th>
            <th style="padding:6px 8px; text-align:right; border-bottom:1px solid #d4d4d8;">Qtà</th>
            <th style="padding:6px 8px; text-align:right; border-bottom:1px solid #d4d4d8;">Prezzo unit.</th>
            <th style="padding:6px 8px; text-align:right; border-bottom:1px solid #d4d4d8;">Importo</th>
          </tr>
        </thead>
        <tbody>${righeHtml}</tbody>
      </table>

      <div style="margin-top:16px; display:flex; justify-content:flex-end;">
        <div style="width:260px;">
          <div style="display:flex; justify-content:space-between; padding:4px 0;">
            <span>Imponibile</span><span>${escapeHtml(formatEuro(imponibile))}</span>
          </div>
          <div style="display:flex; justify-content:space-between; padding:4px 0;">
            <span>IVA${isStandard ? " 22%" : ""}</span><span>${escapeHtml(formatEuro(iva))}</span>
          </div>
          <div style="display:flex; justify-content:space-between; padding:4px 0; font-weight:700; border-top:1px solid #d4d4d8;">
            <span>Totale</span><span>${escapeHtml(formatEuro(totale))}</span>
          </div>
        </div>
      </div>

      <p style="margin-top:16px; font-size:10px; color:#52525b;">
        ${isStandard ? escapeHtml(NOTA_IVA_PRIVATI) : escapeHtml(NOTA_REVERSE_CHARGE)}
      </p>

      ${invoice.condizioniPagamento ? `<p style="margin-top:8px; font-size:11px;">Condizioni di pagamento: ${escapeHtml(invoice.condizioniPagamento)}</p>` : ""}
      ${invoice.note ? `<p style="margin-top:8px; font-size:11px; color:#52525b;">${escapeHtml(invoice.note)}</p>` : ""}

      <p style="margin-top:24px; text-align:center; font-size:10px; color:#71717a;">${escapeHtml(SITE_LINE)}</p>
    </body>
    </html>`;

  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const buf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" },
    });
    await page.close();

    return new NextResponse(Buffer.from(buf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="FATTURA ${numeroLabel.replace("/", "-")}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } finally {
    await browser.close();
  }
}

function companyDisplayNameOrDash(company: Parameters<typeof companyDisplayName>[0]): string {
  return companyDisplayName(company) || "—";
}
