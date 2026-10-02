import type { EntryType } from "@prisma/client";

type DayEntryLike = { type: EntryType; timestamp: Date };

export type DayPause<T> = {
  start: T;
  end: T | null;
  minutes: number;
};

// Riassunto di una giornata col nuovo flusso Inizio/Fine giornata. È l'unica
// fonte del calcolo delle ore di presenza: lo usano sia Presenze (e l'Excel
// per il consulente) sia la griglia Timbrature, così i due non possono
// divergere. `dayEntries` deve contenere le sole voci di quel collaboratore
// in quel giorno, in ordine cronologico crescente.
export function summarizeDay<T extends DayEntryLike>(dayEntries: T[]) {
  const start = dayEntries.find((e) => e.type === "DAY_START") ?? null;
  const ends = dayEntries.filter((e) => e.type === "DAY_END");
  const end = ends[ends.length - 1] ?? null;

  const pauses: DayPause<T>[] = [];
  let openPause: T | null = null;
  for (const e of dayEntries) {
    if (e.type === "PAUSE_START") {
      openPause = e;
    } else if (e.type === "PAUSE_END" && openPause) {
      pauses.push({
        start: openPause,
        end: e,
        minutes: (e.timestamp.getTime() - openPause.timestamp.getTime()) / 60000,
      });
      openPause = null;
    }
  }
  // Una pausa rimasta aperta non si sottrae (non si sa quando è finita), ma
  // va comunque mostrata.
  if (openPause) pauses.push({ start: openPause, end: null, minutes: 0 });

  const pauseMinutes = pauses.reduce((sum, p) => sum + p.minutes, 0);

  // Giornata ancora aperta (nessuna Fine giornata): si stima con l'ultima
  // voce del giorno, come ha sempre fatto Presenze.
  const endTime = end ? end.timestamp : dayEntries[dayEntries.length - 1]?.timestamp;
  const presenceMinutes =
    start && endTime
      ? (endTime.getTime() - start.timestamp.getTime()) / 60000 - pauseMinutes
      : null;

  return { start, end, pauses, pauseMinutes, presenceMinutes, open: !!start && !end };
}
