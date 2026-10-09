import { isWorkingDay, startOfDay } from "@/lib/dates";

// Chiusura aziendale (art. III delle clausole): funzioni pure, usabili sia dal
// server sia dai componenti client. Un periodo di chiusura riduce il canone
// del mese in cui cade solo per chi è nella modalità b (nessun intervento);
// nella modalità a (pulizie di chiusura e riapertura) il canone resta intero.

export type ChiusuraScelta = "DA_DEFINIRE" | "CON_PULIZIE" | "SENZA_PULIZIE";

export type ClosureRange = { dal: Date | string; al: Date | string };

// Le date "AAAA-MM-GG" (dai componenti client) si leggono sempre come giorno
// locale, mai come mezzanotte UTC.
const toDay = (d: Date | string) => {
  if (typeof d === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : startOfDay(new Date(d));
  }
  return startOfDay(d);
};

// Modalità applicata a una sede: la scelta del cliente se c'è, altrimenti
// regola predefinita (a se abbiamo l'accesso ai locali, altrimenti b).
export function modalitaApplicata(
  scelta: ChiusuraScelta,
  accessoSenzaCliente: boolean
): "a" | "b" {
  if (scelta === "CON_PULIZIE") return "a";
  if (scelta === "SENZA_PULIZIE") return "b";
  return accessoSenzaCliente ? "a" : "b";
}

function giorniDelMese(year: number, month: number): Date[] {
  const n = new Date(year, month, 0).getDate();
  return Array.from({ length: n }, (_, i) => new Date(year, month - 1, i + 1));
}

function inChiusura(d: Date, closures: ClosureRange[]): boolean {
  const t = d.getTime();
  return closures.some((c) => t >= toDay(c.dal).getTime() && t <= toDay(c.al).getTime());
}

// Giorni lavorativi di chiusura aziendale in un mese (per le ore disponibili).
export function giorniLavorativiChiusura(
  closures: ClosureRange[],
  year: number,
  month: number
): number {
  return giorniDelMese(year, month).filter((d) => isWorkingDay(d) && inChiusura(d, closures))
    .length;
}

export type FattoreChiusura = {
  fattore: number; // 1 = canone intero
  modalita: "a" | "b";
  programmati: number;
  saltati: number;
  metodo: "passaggi" | "giorni";
};

// Passaggi programmati e non eseguiti nel mese. Con i giorni della settimana
// del turno in Pianificazione (weekdays, 0 = domenica) si contano i passaggi
// veri; senza pianificazione si stima con i giorni lavorativi.
export function fattoreChiusura(args: {
  year: number;
  month: number;
  closures: ClosureRange[];
  scelta: ChiusuraScelta;
  accessoSenzaCliente: boolean;
  weekdays: number[] | null;
}): FattoreChiusura {
  const { year, month, closures, scelta, accessoSenzaCliente, weekdays } = args;
  const modalita = modalitaApplicata(scelta, accessoSenzaCliente);
  const giorni = giorniDelMese(year, month).filter((d) => isWorkingDay(d));
  const programmatiDays =
    weekdays && weekdays.length > 0 ? giorni.filter((d) => weekdays.includes(d.getDay())) : giorni;
  const programmati = programmatiDays.length;
  const saltati = programmatiDays.filter((d) => inChiusura(d, closures)).length;
  const metodo = weekdays && weekdays.length > 0 ? "passaggi" : "giorni";
  if (modalita === "a" || programmati === 0 || saltati === 0) {
    return { fattore: 1, modalita, programmati, saltati, metodo };
  }
  return {
    fattore: Math.max(0, 1 - saltati / programmati),
    modalita,
    programmati,
    saltati,
    metodo,
  };
}

// Importo del mese: l'una tantum non cambia mai; i canoni ricorrenti seguono
// il fattore di chiusura del mese.
export function canoneDelMese(
  base: number,
  serviceType: "ONE_SHOT" | "PASS_SETTIMANALE" | "PASS_MENSILE",
  args: Parameters<typeof fattoreChiusura>[0]
): number {
  if (serviceType === "ONE_SHOT") return base;
  return base * fattoreChiusura(args).fattore;
}
