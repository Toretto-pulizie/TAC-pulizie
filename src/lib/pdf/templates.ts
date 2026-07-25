import fs from "fs";
import path from "path";
import {
  BANCA_APPOGGIO,
  CONDIZIONI_PAGAMENTO_DEFAULT,
  SIGNATURE_LINE,
  SITE_LINE,
  formatEuro,
} from "./stampaConstants";

// Puppeteer's headerTemplate/footerTemplate render in an isolated pass that
// has no access to the app's own stylesheet or Tailwind's CSS variables, so
// everything here is plain inline CSS. The template spans the full physical
// page width regardless of page.pdf()'s left/right margins, so left/right
// padding is included here to match the printed content's own inset.

const ZINC_50 = "#fafafa";
const ZINC_300 = "#d4d4d8";
const ZINC_500 = "#71717a";
const ZINC_600 = "#52525b";
const ZINC_700 = "#3f3f46";
const ZINC_900 = "#18181b";

const CONTENT_PADDING_LEFT_MM = 12; // page.pdf margin.left(6mm) + content pl(6mm)
const CONTENT_PADDING_RIGHT_MM = 15.5; // page.pdf margin.right(6mm) + content pr(9.5mm)

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

let logoDataUriCache: string | null = null;
export function getLogoDataUri(): string {
  if (logoDataUriCache) return logoDataUriCache;
  const buf = fs.readFileSync(path.join(process.cwd(), "public", "logo.png"));
  logoDataUriCache = `data:image/png;base64,${buf.toString("base64")}`;
  return logoDataUriCache;
}

function infoCol(label: string, value: string, opts: { bold?: boolean; last?: boolean } = {}) {
  const { bold, last } = opts;
  return `
    <div style="flex:1; border-right:${last ? "none" : `1px solid ${ZINC_300}`}; min-width:0;">
      <p style="margin:0; border-bottom:1px solid ${ZINC_300}; background:${ZINC_50}; padding:1px 6px; font-size:8px; text-transform:uppercase; line-height:1; letter-spacing:0.025em; color:${ZINC_500};">${escapeHtml(label)}</p>
      <p style="margin:0; padding:2px 6px; font-size:11px; line-height:1.25; color:${ZINC_900}; ${bold ? "font-weight:700;" : ""} white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(value) || "&mdash;"}</p>
    </div>`;
}

export type HeaderTemplateData = {
  numeroOfferta: number | string;
  dataDocumento: string;
  clientName: string;
  indirizzo?: string | null;
  cap?: string | null;
  citta?: string | null;
  provincia?: string | null;
  codiceCliente: string;
  partitaIva?: string | null;
  codiceFiscale?: string | null;
  personaRiferimento?: string | null;
  condizioniPagamento?: string | null;
};

export function buildHeaderTemplate(data: HeaderTemplateData): string {
  const cittaLine = [data.cap, data.citta].filter(Boolean).join(" ");
  const cittaProvincia = data.provincia ? `${cittaLine} (${data.provincia})` : cittaLine;

  return `
    <div style="width:100%; box-sizing:border-box; font-family:sans-serif; font-size:11px; color:${ZINC_900}; padding:6mm ${CONTENT_PADDING_RIGHT_MM}mm 4mm ${CONTENT_PADDING_LEFT_MM}mm;">
      <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:24px;">
        <div style="display:flex; flex-direction:column; gap:8px;">
          <img src="${getLogoDataUri()}" alt="Toretto" style="width:260px; height:75px;" />
          <div style="margin-top:30px; width:176px; border-radius:8px; border:1px solid ${ZINC_300};">
            <p style="margin:0; border-bottom:1px solid ${ZINC_300}; background:${ZINC_50}; padding:2px 6px; text-align:center; font-size:9px; font-weight:600; text-transform:uppercase; line-height:1; letter-spacing:0.025em; color:${ZINC_700};">Offerta</p>
            <div style="display:flex;">
              ${infoCol("N. Doc.", String(data.numeroOfferta), { bold: true })}
              ${infoCol("Data", data.dataDocumento, { bold: true })}
              ${infoCol("Pag.", "1/1", { last: true })}
            </div>
          </div>
        </div>
        <div style="margin-right:32px; text-align:left; font-size:14px;">
          <p style="margin:0;">SPETT.LE</p>
          <p style="margin:0; font-weight:600;">${escapeHtml(data.clientName)}</p>
          ${data.indirizzo ? `<p style="margin:0; font-weight:600;">${escapeHtml(data.indirizzo)}</p>` : ""}
          ${cittaProvincia ? `<p style="margin:0; font-weight:600;">${escapeHtml(cittaProvincia)}</p>` : ""}
        </div>
      </div>

      <div style="margin-top:5mm; border-radius:8px; border:1px solid ${ZINC_300};">
        <div style="display:flex; border-bottom:1px solid ${ZINC_300};">
          ${infoCol("Cod. cliente", data.codiceCliente)}
          ${infoCol("P. IVA", data.partitaIva ?? "")}
          ${infoCol("Codice fiscale", data.codiceFiscale ?? "")}
          ${infoCol("Persona di riferimento", data.personaRiferimento ?? "", { last: true })}
        </div>
        <div style="display:flex;">
          ${infoCol("Banca d'appoggio", BANCA_APPOGGIO)}
          ${infoCol("Condizioni di pagamento", data.condizioniPagamento ?? CONDIZIONI_PAGAMENTO_DEFAULT, { last: true })}
        </div>
      </div>
    </div>`;
}

export type FooterTemplateData = {
  dataScadenza: string;
  totaleLabel: string;
  isPersonaFisica: boolean;
  totaleIva: number;
  totaleConIva: number;
};

export function buildFooterTemplate(data: FooterTemplateData): string {
  return `
    <div style="width:100%; box-sizing:border-box; font-family:sans-serif; font-size:11px; color:${ZINC_900}; padding:4mm ${CONTENT_PADDING_RIGHT_MM}mm 6mm ${CONTENT_PADDING_LEFT_MM}mm;">
      <div style="border-radius:8px; border:1px solid ${ZINC_300};">
        <div style="display:flex; border-bottom:1px solid ${ZINC_300};">
          <div style="flex:1; display:flex; align-items:center; justify-content:center; border-right:1px solid ${ZINC_300}; padding:8px; text-align:center; font-size:10px; color:${ZINC_600};">
            Valida fino al <span style="margin-left:4px; font-weight:700; color:${ZINC_900};">${escapeHtml(data.dataScadenza)}</span>
          </div>
          <div style="width:224px; padding:8px;">
            <div style="display:flex; align-items:center; justify-content:space-between;">
              <p style="margin:0; font-size:12px; color:${ZINC_500};">Totale</p>
              <p style="margin:0; font-size:18px; font-weight:600; color:${ZINC_900};">${escapeHtml(data.totaleLabel)}</p>
            </div>
            ${
              data.isPersonaFisica
                ? `<p style="margin:4px 0 0; font-size:12px; color:${ZINC_500};">IVA 22%: ${escapeHtml(formatEuro(data.totaleIva))}</p>
                   <p style="margin:0; font-size:14px; font-weight:600; color:${ZINC_900};">Totale IVA inclusa: ${escapeHtml(formatEuro(data.totaleConIva))}</p>`
                : ""
            }
          </div>
        </div>
        <div style="display:flex;">
          <div style="flex:1;">
            <p style="margin:0; border-bottom:1px solid ${ZINC_300}; padding:8px; font-size:10px; font-weight:700; color:${ZINC_900};">
              I rifiuti prodotti dalle attività restano a carico del committente.
            </p>
            <p style="margin:0; padding:8px; font-size:10px; color:${ZINC_600};">
              In caso di accettazione, firmare nell'apposito spazio e rispedire. La firma darà inizio ai lavori. Le clausole generali allegate costituiscono parte integrante del contratto in caso di accettazione.
            </p>
          </div>
          <div style="width:224px; border-left:1px solid ${ZINC_300}; padding:2px 8px 8px; text-align:center;">
            <p style="margin:0; font-size:10px; font-weight:500; color:${ZINC_500};">Timbro e firma per accettazione</p>
          </div>
        </div>
      </div>

      <div style="text-align:center; font-size:10px; color:${ZINC_900};">
        <p style="margin:4px 0 0; font-weight:700;">${escapeHtml(SIGNATURE_LINE)}</p>
        <p style="margin:0; font-weight:700;">${escapeHtml(SITE_LINE)}</p>
      </div>
    </div>`;
}
