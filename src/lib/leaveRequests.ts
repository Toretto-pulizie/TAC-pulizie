import type { TipoAssenza } from "@prisma/client";
import { isWorkingDay, monthRange } from "@/lib/dates";

export const TIPO_LABELS: Record<TipoAssenza, string> = {
  INFORTUNIO: "Infortunio",
  MALATTIA: "Malattia",
  PERMESSO: "Permesso",
  PERMESSO_RETRIBUITO: "Permesso retribuito",
  LEGGE_104: "Legge 104",
  FERIE_RICHIESTE: "Ferie",
  FERIE_AZIENDALI: "Ferie aziendali",
  MATERNITA_ANTICIPATA: "Maternità anticipata",
  MATERNITA_FACOLTATIVA: "Maternità facoltativa",
};

export const TIPO_CODES: Record<TipoAssenza, string> = {
  INFORTUNIO: "I",
  MALATTIA: "M",
  PERMESSO: "P",
  PERMESSO_RETRIBUITO: "PR",
  LEGGE_104: "H9",
  FERIE_RICHIESTE: "F",
  FERIE_AZIENDALI: "FA",
  MATERNITA_ANTICIPATA: "MT",
  MATERNITA_FACOLTATIVA: "MF",
};

export const STATO_LABELS = {
  IN_ATTESA: "In attesa",
  APPROVATO: "Approvato",
  RIFIUTATO: "Rifiutato",
} as const;

/** Elenca le date (a mezzanotte) comprese tra dataInizio e dataFine, incluse. */
export function expandDateRange(dataInizio: Date, dataFine: Date): Date[] {
  const days: Date[] = [];
  const current = new Date(dataInizio);
  current.setHours(0, 0, 0, 0);
  const end = new Date(dataFine);
  end.setHours(0, 0, 0, 0);

  while (current.getTime() <= end.getTime()) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

// Ore perse per permessi/assenze approvati (Ferie aziendali comprese) nel
// mese/anno dato: 8h per ogni giorno lavorativo (esclusi sabati, domeniche e
// feste comandate — già esclusi dalla capacità lorda, quindi non vanno
// scontati due volte) coperto da una richiesta approvata. Non distingue tra
// tipi di assenza: qualunque permesso approvato riduce la capacità.
export function hoursLostToApprovedLeave(
  leaveRequests: { dataInizio: Date; dataFine: Date }[],
  year: number,
  month: number
): number {
  const { start, end } = monthRange(year, month);
  let lostDays = 0;
  for (const req of leaveRequests) {
    for (const day of expandDateRange(req.dataInizio, req.dataFine)) {
      if (day < start || day > end) continue;
      if (isWorkingDay(day)) lostDays++;
    }
  }
  return lostDays * 8;
}
