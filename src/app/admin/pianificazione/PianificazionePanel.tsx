"use client";

import { useState } from "react";
import { PageHeaderActions } from "../PageHeaderActions";
import { TurnoForm } from "./TurnoForm";
import { WeekCalendar, type ShiftItem } from "./WeekCalendar";

type QuoteSiteOption = {
  id: string;
  siteId: string;
  label: string;
  serviceType: "ONE_SHOT" | "PASS_SETTIMANALE" | "PASS_MENSILE";
  ore: number;
};
type Site = {
  id: string;
  label: string;
  capienza: number | null;
  quoteSites: { id: string; ore: number; label: string }[];
};

// Il pulsante "+ Nuovo turno" vive nel box condiviso in alto (vedi
// PageHeaderActions); il pannello di creazione/modifica resta però nel
// corpo della pagina, quindi lo stato "aperto"/"in modifica" va condiviso
// tra il pulsante e il calendario (aprire un turno dal calendario deve
// aprire lo stesso pannello, non uno separato).
export function PianificazionePanel({
  employees,
  sites,
  occupancy,
  defaultDate,
  quoteSites,
  frequenzaLabels,
  days,
  shiftsByDay,
  startHour,
  endHour,
}: {
  employees: { id: string; name: string }[];
  sites: Site[];
  occupancy: Record<string, Record<string, number>>;
  defaultDate: string;
  quoteSites: QuoteSiteOption[];
  frequenzaLabels: { settimanale: string; mensile: string };
  days: Date[];
  shiftsByDay: ShiftItem[][];
  startHour: number;
  endHour: number;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ShiftItem | null>(null);

  function closePanel() {
    setOpen(false);
    setEditing(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeaderActions>
        <button
          type="button"
          onClick={() => (open ? closePanel() : setOpen(true))}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          {open ? "✕ Chiudi modulo" : "+ Nuovo turno"}
        </button>
      </PageHeaderActions>

      {open && (
        <TurnoForm
          employees={employees}
          sites={sites}
          quoteSites={quoteSites}
          frequenzaLabels={frequenzaLabels}
          occupancy={occupancy}
          defaultDate={defaultDate}
          editing={editing}
          onDone={closePanel}
        />
      )}

      <WeekCalendar
        days={days}
        shiftsByDay={shiftsByDay}
        startHour={startHour}
        endHour={endHour}
        onEditShift={(shift) => {
          setEditing(shift);
          setOpen(true);
        }}
      />
    </div>
  );
}
