import type { EntryType, StatoRichiesta, TipoAssenza } from "@prisma/client";
import { TIPO_CODES, expandDateRange } from "@/lib/leaveRequests";
import { splitBySessionId } from "@/lib/timeCalc";

export type DayCell = { day: number; hours: number | null; code: string | null };

export type EmployeeAttendance = {
  userId: string;
  cognome: string;
  nome: string;
  days: DayCell[];
  totaleOre: number;
  totaliAssenza: Partial<Record<TipoAssenza, number>>;
};

type TimeEntryLite = {
  userId: string;
  type: EntryType;
  timestamp: Date;
  sessionId?: string | null;
};
type LeaveRequestLite = {
  userId: string;
  tipo: TipoAssenza;
  dataInizio: Date;
  dataFine: Date;
  stato: StatoRichiesta;
};
type EmployeeLite = { id: string; name: string; cognome: string | null };

const START_TYPES = new Set<EntryType>(["WORK_START", "SOPRALLUOGO_START"]);
const END_TYPES = new Set<EntryType>(["WORK_END", "SOPRALLUOGO_END"]);

// Il Sopralluogo conta come tempo di presenza esattamente come il lavoro
// (il collaboratore va comunque pagato per quel tempo), anche se non entra
// nei totali di Ore lavoro fatturabili al cliente (Consuntivi/Statistiche).
//
// Nuovo flusso "Inizio/Fine giornata": se una giornata ha un DAY_START, le
// ore di presenza sono l'intero intervallo Inizio giornata -> Fine giornata
// (spostamenti compresi), meno le pause — non più la somma delle sole
// sessioni di lavoro/sopralluogo. Le giornate senza DAY_START (dati storici,
// o inserimenti manuali admin che non passano dal nuovo flusso) continuano a
// usare esattamente il calcolo di sempre, per non alterare nulla di già
// registrato.
function hoursPerDay(entries: TimeEntryLite[]): Map<number, number> {
  const sorted = [...entries].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  const byDay = new Map<number, TimeEntryLite[]>();
  for (const e of sorted) {
    const day = e.timestamp.getDate();
    const list = byDay.get(day) ?? [];
    list.push(e);
    byDay.set(day, list);
  }

  const map = new Map<number, number>();

  for (const [day, dayEntries] of byDay) {
    const dayStart = dayEntries.find((e) => e.type === "DAY_START");

    if (dayStart) {
      const dayEnds = dayEntries.filter((e) => e.type === "DAY_END");
      const dayEnd = dayEnds[dayEnds.length - 1] ?? null;
      const endTime = dayEnd ? dayEnd.timestamp : dayEntries[dayEntries.length - 1].timestamp;
      let minutes = (endTime.getTime() - dayStart.timestamp.getTime()) / 60000;

      let pauseStart: Date | null = null;
      for (const e of dayEntries) {
        if (e.type === "PAUSE_START") {
          pauseStart = e.timestamp;
        } else if (e.type === "PAUSE_END" && pauseStart) {
          minutes -= (e.timestamp.getTime() - pauseStart.getTime()) / 60000;
          pauseStart = null;
        }
      }
      if (minutes > 0) {
        map.set(day, (map.get(day) ?? 0) + minutes / 60);
      }
      continue;
    }

    // Vecchio flusso, invariato: somma le durate Inizio->Fine di ogni
    // sessione di lavoro/sopralluogo. Le voci con sessionId esplicito sono
    // già legate con certezza (vedi timeCalc.ts): usarlo evita di doverle
    // re-indovinare dall'ordine cronologico, ambiguo quando due sessioni
    // condividono lo stesso orario.
    const add = (start: Date, end: Date) => {
      const minutes = (end.getTime() - start.getTime()) / 60000;
      map.set(day, (map.get(day) ?? 0) + minutes / 60);
    };
    const { grouped, legacy } = splitBySessionId(dayEntries);
    for (const group of grouped.values()) {
      const start = group.find((g) => START_TYPES.has(g.type));
      const end = group.find((g) => END_TYPES.has(g.type));
      if (start && end) add(start.timestamp, end.timestamp);
    }
    let pendingStart: Date | null = null;
    for (const e of legacy) {
      if (START_TYPES.has(e.type)) {
        pendingStart = e.timestamp;
      } else if (END_TYPES.has(e.type) && pendingStart) {
        add(pendingStart, e.timestamp);
        pendingStart = null;
      }
    }
  }

  return map;
}

function leaveCodePerDay(
  requests: LeaveRequestLite[],
  year: number,
  month: number
): Map<number, TipoAssenza> {
  const map = new Map<number, TipoAssenza>();
  for (const lr of requests) {
    if (lr.stato !== "APPROVATO") continue;
    for (const d of expandDateRange(lr.dataInizio, lr.dataFine)) {
      if (d.getFullYear() === year && d.getMonth() === month - 1) {
        map.set(d.getDate(), lr.tipo);
      }
    }
  }
  return map;
}

export function computeMonthlyAttendance(
  employees: EmployeeLite[],
  timeEntries: TimeEntryLite[],
  leaveRequests: LeaveRequestLite[],
  year: number,
  month: number
): EmployeeAttendance[] {
  const daysInMonth = new Date(year, month, 0).getDate();

  const entriesByUser = new Map<string, TimeEntryLite[]>();
  for (const e of timeEntries) {
    const list = entriesByUser.get(e.userId) ?? [];
    list.push(e);
    entriesByUser.set(e.userId, list);
  }

  const leavesByUser = new Map<string, LeaveRequestLite[]>();
  for (const lr of leaveRequests) {
    const list = leavesByUser.get(lr.userId) ?? [];
    list.push(lr);
    leavesByUser.set(lr.userId, list);
  }

  return employees.map((emp) => {
    const hours = hoursPerDay(entriesByUser.get(emp.id) ?? []);
    const leaves = leaveCodePerDay(leavesByUser.get(emp.id) ?? [], year, month);

    const days: DayCell[] = [];
    let totaleOre = 0;
    const totaliAssenza: Partial<Record<TipoAssenza, number>> = {};

    for (let d = 1; d <= daysInMonth; d++) {
      const tipo = leaves.get(d);
      const h = hours.get(d);

      if (tipo) {
        totaliAssenza[tipo] = (totaliAssenza[tipo] ?? 0) + 1;
        days.push({ day: d, hours: null, code: TIPO_CODES[tipo] });
      } else if (h) {
        const rounded = Math.round(h * 4) / 4;
        totaleOre += rounded;
        days.push({ day: d, hours: rounded, code: null });
      } else {
        days.push({ day: d, hours: null, code: null });
      }
    }

    return {
      userId: emp.id,
      cognome: emp.cognome ?? "",
      nome: emp.name,
      days,
      totaleOre: Math.round(totaleOre * 4) / 4,
      totaliAssenza,
    };
  });
}
