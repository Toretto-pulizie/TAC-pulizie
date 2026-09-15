function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function toDateInputValue(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function startOfDay(d: Date) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfDay(d: Date) {
  const date = new Date(d);
  date.setHours(23, 59, 59, 999);
  return date;
}

export function startOfWeek(d: Date) {
  const date = startOfDay(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

export function addDays(d: Date, n: number) {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}

const WEEKDAY_LABELS = [
  "Lunedì",
  "Martedì",
  "Mercoledì",
  "Giovedì",
  "Venerdì",
  "Sabato",
  "Domenica",
];

export function weekdayLabel(d: Date) {
  const day = d.getDay();
  return WEEKDAY_LABELS[day === 0 ? 6 : day - 1];
}

export function formatDateLabel(d: Date) {
  return `${weekdayLabel(d)} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

export function formatTime(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const MONTH_LABELS = [
  "Gennaio",
  "Febbraio",
  "Marzo",
  "Aprile",
  "Maggio",
  "Giugno",
  "Luglio",
  "Agosto",
  "Settembre",
  "Ottobre",
  "Novembre",
  "Dicembre",
];

export function monthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(year, month, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// Domenica di Pasqua per l'anno dato (algoritmo di Gauss/Meeus-Jones-Butcher).
// Serve per Pasqua e Pasquetta, le uniche feste comandate "mobili".
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

// Feste comandate nazionali, più Pasqua/Pasquetta e il Patrono di Torino (San
// Giovanni Battista, 24 giugno) — l'azienda opera nell'area di Torino.
export function italianHolidays(year: number): Date[] {
  const easter = easterSunday(year);
  const easterMonday = addDays(easter, 1);
  return [
    new Date(year, 0, 1), // Capodanno
    new Date(year, 0, 6), // Epifania
    easter, // Pasqua
    easterMonday, // Pasquetta
    new Date(year, 3, 25), // Liberazione
    new Date(year, 4, 1), // Festa dei lavoratori
    new Date(year, 5, 2), // Festa della Repubblica
    new Date(year, 5, 24), // San Giovanni Battista (patrono di Torino)
    new Date(year, 7, 15), // Ferragosto
    new Date(year, 10, 1), // Ognissanti
    new Date(year, 11, 8), // Immacolata Concezione
    new Date(year, 11, 25), // Natale
    new Date(year, 11, 26), // Santo Stefano
  ];
}

// Giorni lavorativi (lunedì-venerdì, esclusi sabato/domenica e le feste
// comandate) nel mese/anno dato.
export function workingDaysInMonth(year: number, month: number): number {
  const holidays = new Set(
    italianHolidays(year).map((d) => toDateInputValue(d))
  );
  const daysInMonth = new Date(year, month, 0).getDate();
  let count = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day);
    const weekday = d.getDay();
    if (weekday === 0 || weekday === 6) continue;
    if (holidays.has(toDateInputValue(d))) continue;
    count++;
  }
  return count;
}
