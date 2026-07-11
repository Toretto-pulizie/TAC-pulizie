"use client";

import { useTransition } from "react";
import { deleteShift } from "@/app/actions/shifts";
import { colorForId } from "@/lib/colors";
import { formatDateLabel, formatTime } from "@/lib/dates";

const ROW_HEIGHT = 48; // px per hour

type ShiftItem = {
  id: string;
  start: Date;
  end: Date;
  userId: string;
  employeeName: string;
  siteLabel: string;
  notes: string | null;
};

function toHourFloat(d: Date) {
  return d.getHours() + d.getMinutes() / 60;
}

function ShiftBlock({ shift, startHour }: { shift: ShiftItem; startHour: number }) {
  const [isPending, startTransition] = useTransition();
  const color = colorForId(shift.userId);
  const top = (toHourFloat(shift.start) - startHour) * ROW_HEIGHT;
  const height = Math.max(
    (toHourFloat(shift.end) - toHourFloat(shift.start)) * ROW_HEIGHT,
    20
  );

  return (
    <div
      className={`group absolute left-1 right-1 overflow-hidden rounded-md border px-2 py-1 text-xs shadow-sm ${color.bg} ${color.border} ${color.text}`}
      style={{ top, height }}
      title={`${shift.employeeName} · ${shift.siteLabel} · ${formatTime(shift.start)}–${formatTime(shift.end)}${shift.notes ? " · " + shift.notes : ""}`}
    >
      <button
        disabled={isPending}
        onClick={() => startTransition(() => deleteShift(shift.id))}
        className="absolute right-1 top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-white/80 text-[10px] leading-none text-zinc-600 group-hover:flex"
        aria-label="Rimuovi turno"
      >
        ×
      </button>
      <p className="truncate font-semibold">{shift.employeeName}</p>
      <p className="truncate">{shift.siteLabel}</p>
      <p className="truncate text-[10px] opacity-80">
        {formatTime(shift.start)}–{formatTime(shift.end)}
      </p>
    </div>
  );
}

export function WeekCalendar({
  days,
  shiftsByDay,
  startHour,
  endHour,
}: {
  days: Date[];
  shiftsByDay: ShiftItem[][];
  startHour: number;
  endHour: number;
}) {
  const hours = Array.from(
    { length: endHour - startHour + 1 },
    (_, i) => startHour + i
  );
  const totalHeight = (endHour - startHour) * ROW_HEIGHT;

  return (
    <div className="flex overflow-x-auto rounded-xl border border-zinc-200 bg-white">
      <div className="flex w-14 shrink-0 flex-col border-r border-zinc-200">
        <div className="h-12 shrink-0 border-b border-zinc-200" />
        <div className="relative" style={{ height: totalHeight }}>
          {hours.map((h) => (
            <div
              key={h}
              className="absolute right-2 -translate-y-2 text-xs text-zinc-400"
              style={{ top: (h - startHour) * ROW_HEIGHT }}
            >
              {h}:00
            </div>
          ))}
        </div>
      </div>

      {days.map((day, i) => (
        <div
          key={day.toISOString()}
          className="flex min-w-[140px] flex-1 flex-col border-r border-zinc-100 last:border-r-0"
        >
          <div className="flex h-12 shrink-0 items-center justify-center border-b border-zinc-200 text-sm font-medium text-zinc-900">
            {formatDateLabel(day)}
          </div>
          <div className="relative" style={{ height: totalHeight }}>
            {hours.map((h) => (
              <div
                key={h}
                className="absolute w-full border-t border-zinc-100"
                style={{ top: (h - startHour) * ROW_HEIGHT }}
              />
            ))}
            {shiftsByDay[i].map((s) => (
              <ShiftBlock key={s.id} shift={s} startHour={startHour} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
