// TODO: sostituire con i dati bancari reali dell'azienda
export const BANCA_APPOGGIO = "[Nome banca] - IBAN: [IBAN]";
export const CONDIZIONI_PAGAMENTO_DEFAULT = "A ricevimento fattura";
export const ALIQUOTA_IVA = 0.22;
export const VALIDITA_GIORNI = 90;

export const NOTA_REVERSE_CHARGE =
  'Operazione soggetta al meccanismo dell’inversione contabile ("reverse charge") ai sensi dell’art. 17, comma 6, lett. a-ter), D.P.R. 26 ottobre 1972, n. 633 — IVA assolta dal committente, non addebitata in fattura.';
export const NOTA_IVA_PRIVATI =
  "IVA esposta in fattura con applicazione dell'aliquota ordinaria (22%) ai sensi del D.P.R. 26 ottobre 1972, n. 633, non trattandosi di operazione tra soggetti passivi d'imposta.";

export const SIGNATURE_LINE =
  "Enrico Tavernese — Via Poliziano 41/A, 10153 Torino (TO) — Tel. 011 062 1320 — P.I. 10844590017 — C.F. TVRNRC78R14L219R";
export const SITE_LINE = "www.toret-to.it — Mail: info@toret-to.it";

export function formatEuro(n: number) {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}
