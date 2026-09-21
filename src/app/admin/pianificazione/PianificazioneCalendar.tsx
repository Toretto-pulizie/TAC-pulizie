"use client";

import { useState } from "react";
import { ShiftForm } from "./ShiftForm";
import { WeekCalendar, type ShiftItem } from "./WeekCalendar";

type Site = {
  id: string;
  label: string;
  capienza: number | null;
  quoteSites: { id: string; ore: number; label: string }[];
};

export function PianificazioneCalendar({
  employees,
  sites,
  occupancy,
  defaultDate,
  days,
  shiftsByDay,
  startHour,
  endHour,
}: {
  employees: { id: string; name: string }[];
  sites: Site[];
  occupancy: Record<string, Record<string, number>>;
  defaultDate: string;
  days: Date[];
  shiftsByDay: ShiftItem[][];
  startHour: number;
  endHour: number;
}) {
  const [editing, setEditing] = useState<ShiftItem | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <ShiftForm
        employees={employees}
        sites={sites}
        occupancy={occupancy}
        defaultDate={defaultDate}
        editing={editing}
        onDoneEditing={() => setEditing(null)}
      />
      <WeekCalendar
        days={days}
        shiftsByDay={shiftsByDay}
        startHour={startHour}
        endHour={endHour}
        onEditShift={(shift) => setEditing(shift)}
      />
    </div>
  );
}
