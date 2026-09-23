"use client";

import { useRef, useState, useTransition } from "react";
import { deleteShiftGroup, moveShift, checkShiftConflicts } from "@/app/actions/shifts";
import { colorForId } from "@/lib/colors";
import { formatDateLabel, formatTime, addDays } from "@/lib/dates";
import { ShiftConflictDialog, hasWarnings } from "./ShiftConflictDialog";
import type { ShiftConflicts } from "@/lib/shiftConflicts";

const ROW_HEIGHT = 48; // px per ora — coincide con l'altezza dell'header colonna (h-12)
const HEADER_HEIGHT = 48;
const SNAP_MINUTES = 15;
const MIN_DURATION_MINUTES = 30;

export type ShiftMember = {
  shiftId: string;
  userId: string;
  employeeName: string;
  planId: string | null;
};

// Un turno può coinvolgere più collaboratori insieme sullo stesso
// cantiere/orario (stesso groupId): in calendario è un unico blocco, non
// uno per collaboratore.
export type ShiftItem = {
  groupId: string;
  start: Date;
  end: Date;
  siteId: string;
  siteLabel: string;
  notes: string | null;
  members: ShiftMember[];
};

function toHourFloat(d: Date) {
  return d.getHours() + d.getMinutes() / 60;
}

function addMinutes(d: Date, minutes: number) {
  return new Date(d.getTime() + minutes * 60000);
}

function snap(minutes: number) {
  return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
}

function membersLabel(members: ShiftMember[]) {
  return members.map((m) => m.employeeName).join(", ");
}

type DragMode = "move" | "resize-start" | "resize-end";

type DragState = {
  shift: ShiftItem;
  mode: DragMode;
  originDayIndex: number;
  pointerStartX: number;
  pointerStartY: number;
  moved: boolean;
};

type LiveRange = { start: Date; end: Date; dayIndex: number };

function ShiftBlock({
  shift,
  startHour,
  hidden,
  onPointerDownMove,
  onPointerDownResizeStart,
  onPointerDownResizeEnd,
  onDelete,
}: {
  shift: ShiftItem;
  startHour: number;
  hidden: boolean;
  onPointerDownMove: (e: React.PointerEvent) => void;
  onPointerDownResizeStart: (e: React.PointerEvent) => void;
  onPointerDownResizeEnd: (e: React.PointerEvent) => void;
  onDelete: () => void;
}) {
  const color = colorForId(shift.groupId);
  const top = (toHourFloat(shift.start) - startHour) * ROW_HEIGHT;
  const height = Math.max(
    (toHourFloat(shift.end) - toHourFloat(shift.start)) * ROW_HEIGHT,
    20
  );
  const names = membersLabel(shift.members);

  return (
    <div
      className={`group absolute left-1 right-1 overflow-hidden rounded-md border px-2 py-1 text-xs shadow-sm select-none ${color.bg} ${color.border} ${color.text} ${
        hidden ? "opacity-30" : "cursor-grab active:cursor-grabbing"
      }`}
      style={{ top, height }}
      title={`${names} · ${shift.siteLabel} · ${formatTime(shift.start)}–${formatTime(shift.end)}${shift.notes ? " · " + shift.notes : ""}`}
      onPointerDown={onPointerDownMove}
    >
      <div
        onPointerDown={(e) => {
          e.stopPropagation();
          onPointerDownResizeStart(e);
        }}
        className="absolute inset-x-0 top-0 h-1.5 cursor-row-resize"
      />
      <button
        onClick={(e) => {
          e.stopPropagation();
          const msg =
            shift.members.length > 1
              ? `Rimuovere questo turno per tutti e ${shift.members.length} i collaboratori?`
              : "Rimuovere questo turno?";
          if (confirm(msg)) onDelete();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute right-1 top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-white/80 text-[10px] leading-none text-zinc-600 group-hover:flex"
        aria-label="Rimuovi turno"
      >
        ×
      </button>
      <p className="truncate font-semibold">{names}</p>
      <p className="truncate">{shift.siteLabel}</p>
      <p className="truncate text-[10px] opacity-80">
        {formatTime(shift.start)}–{formatTime(shift.end)}
      </p>
      <div
        onPointerDown={(e) => {
          e.stopPropagation();
          onPointerDownResizeEnd(e);
        }}
        className="absolute inset-x-0 bottom-0 h-1.5 cursor-row-resize"
      />
    </div>
  );
}

export function WeekCalendar({
  days,
  shiftsByDay,
  startHour,
  endHour,
  onEditShift,
}: {
  days: Date[];
  shiftsByDay: ShiftItem[][];
  startHour: number;
  endHour: number;
  onEditShift: (shift: ShiftItem) => void;
}) {
  const hours = Array.from(
    { length: endHour - startHour + 1 },
    (_, i) => startHour + i
  );
  const totalHeight = (endHour - startHour) * ROW_HEIGHT;
  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const [dragGroupId, setDragGroupId] = useState<string | null>(null);
  const [liveRange, setLiveRange] = useState<LiveRange | null>(null);
  const [pendingMove, setPendingMove] = useState<{
    shift: ShiftItem;
    start: Date;
    end: Date;
    conflicts: ShiftConflicts;
  } | null>(null);
  const [, startChecking] = useTransition();
  const [, startDeleting] = useTransition();

  // Drag imperativo: i listener vengono attaccati direttamente nel gestore
  // di pointerdown (non tramite useEffect), così funzionano anche quando
  // pointermove/pointerup arrivano prima che React abbia il tempo di
  // ri-renderizzare e committare un eventuale effect.
  function startDrag(shift: ShiftItem, dayIndex: number, mode: DragMode, e: React.PointerEvent) {
    if (e.button !== 0) return;
    e.preventDefault();

    const state: DragState = {
      shift,
      mode,
      originDayIndex: dayIndex,
      pointerStartX: e.clientX,
      pointerStartY: e.clientY,
      moved: false,
    };
    dragRef.current = state;
    setDragGroupId(shift.groupId);

    function computeLiveRange(clientX: number, clientY: number): LiveRange {
      const deltaY = clientY - state.pointerStartY;
      const deltaMinutes = snap((deltaY / ROW_HEIGHT) * 60);

      let targetDayIndex = state.originDayIndex;
      if (state.mode === "move") {
        // Colonna più vicina al centro, non "quella che contiene esattamente
        // il cursore": un rilascio anche di un solo pixel fuori dai bordi di
        // una colonna (bordo, scrollbar, cursore leggermente più in alto o
        // più a destra dell'ultima colonna) altrimenti non trova alcuna
        // corrispondenza e il turno resta silenziosamente sul giorno di
        // partenza, senza nessun avviso per l'utente.
        let bestDistance = Infinity;
        for (let i = 0; i < columnRefs.current.length; i++) {
          const rect = columnRefs.current[i]?.getBoundingClientRect();
          if (!rect) continue;
          const distance = Math.abs(clientX - (rect.left + rect.width / 2));
          if (distance < bestDistance) {
            bestDistance = distance;
            targetDayIndex = i;
          }
        }
      }
      const dayDelta = targetDayIndex - state.originDayIndex;

      let newStart = addDays(state.shift.start, dayDelta);
      let newEnd = addDays(state.shift.end, dayDelta);
      if (state.mode === "move") {
        newStart = addMinutes(newStart, deltaMinutes);
        newEnd = addMinutes(newEnd, deltaMinutes);
      } else if (state.mode === "resize-start") {
        newStart = addMinutes(newStart, deltaMinutes);
        if (newEnd.getTime() - newStart.getTime() < MIN_DURATION_MINUTES * 60000) {
          newStart = addMinutes(newEnd, -MIN_DURATION_MINUTES);
        }
      } else {
        newEnd = addMinutes(newEnd, deltaMinutes);
        if (newEnd.getTime() - newStart.getTime() < MIN_DURATION_MINUTES * 60000) {
          newEnd = addMinutes(newStart, MIN_DURATION_MINUTES);
        }
      }
      return { start: newStart, end: newEnd, dayIndex: targetDayIndex };
    }

    // Se il calendario scorre orizzontalmente (più giorni di quanti ne
    // stiano a schermo), trascinare verso il bordo sinistro/destro deve
    // scorrerlo automaticamente — altrimenti un giorno fuori vista non è
    // mai raggiungibile tenendo premuto il mouse.
    const EDGE_PX = 48;
    const SCROLL_SPEED = 16;
    function autoScroll(clientX: number) {
      const el = scrollRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (clientX < rect.left + EDGE_PX) {
        el.scrollLeft -= SCROLL_SPEED;
      } else if (clientX > rect.right - EDGE_PX) {
        el.scrollLeft += SCROLL_SPEED;
      }
    }

    function handleMove(ev: PointerEvent) {
      const distance = Math.hypot(
        ev.clientX - state.pointerStartX,
        ev.clientY - state.pointerStartY
      );
      if (distance > 4) state.moved = true;
      if (!state.moved) return;
      if (state.mode === "move") autoScroll(ev.clientX);
      setLiveRange(computeLiveRange(ev.clientX, ev.clientY));
    }

    function handleUp(ev: PointerEvent) {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      dragRef.current = null;
      setDragGroupId(null);

      if (!state.moved) {
        setLiveRange(null);
        onEditShift(state.shift);
        return;
      }

      const range = computeLiveRange(ev.clientX, ev.clientY);
      setLiveRange(null);
      startChecking(async () => {
        const conflicts = await checkShiftConflicts({
          userIds: state.shift.members.map((m) => m.userId),
          siteId: state.shift.siteId,
          start: range.start.toISOString(),
          end: range.end.toISOString(),
          excludeShiftIds: state.shift.members.map((m) => m.shiftId),
        });
        if (hasWarnings(conflicts)) {
          setPendingMove({ shift: state.shift, start: range.start, end: range.end, conflicts });
        } else {
          const result = await moveShift({
            groupId: state.shift.groupId,
            start: range.start.toISOString(),
            end: range.end.toISOString(),
          });
          if (result && "error" in result) alert(result.error);
        }
      });
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }

  function confirmPendingMove() {
    if (!pendingMove) return;
    const { shift, start, end } = pendingMove;
    setPendingMove(null);
    startChecking(async () => {
      const result = await moveShift({
        groupId: shift.groupId,
        start: start.toISOString(),
        end: end.toISOString(),
      });
      if (result && "error" in result) alert(result.error);
    });
  }

  const ghostColumnRect = liveRange
    ? columnRefs.current[liveRange.dayIndex]?.getBoundingClientRect()
    : null;
  const draggedShift = dragRef.current?.shift;
  const ghostColor = draggedShift ? colorForId(draggedShift.groupId) : null;

  return (
    <>
      <div
        ref={scrollRef}
        className="flex overflow-x-auto rounded-xl border border-zinc-200 bg-white [contain:inline-size]"
      >
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

        {days.map((day, dayIndex) => (
          <div
            key={day.toISOString()}
            ref={(el) => {
              columnRefs.current[dayIndex] = el;
            }}
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
              {shiftsByDay[dayIndex].map((s) => (
                <ShiftBlock
                  key={s.groupId}
                  shift={s}
                  startHour={startHour}
                  hidden={dragGroupId === s.groupId}
                  onPointerDownMove={(e) => startDrag(s, dayIndex, "move", e)}
                  onPointerDownResizeStart={(e) => startDrag(s, dayIndex, "resize-start", e)}
                  onPointerDownResizeEnd={(e) => startDrag(s, dayIndex, "resize-end", e)}
                  onDelete={() => startDeleting(() => deleteShiftGroup(s.groupId))}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {liveRange && ghostColumnRect && draggedShift && ghostColor && (
        <div
          className={`pointer-events-none fixed z-40 overflow-hidden rounded-md border px-2 py-1 text-xs shadow-lg ${ghostColor.bg} ${ghostColor.border} ${ghostColor.text}`}
          style={{
            left: ghostColumnRect.left + 4,
            width: ghostColumnRect.width - 8,
            top:
              ghostColumnRect.top +
              HEADER_HEIGHT +
              (toHourFloat(liveRange.start) - startHour) * ROW_HEIGHT,
            height: Math.max(
              (toHourFloat(liveRange.end) - toHourFloat(liveRange.start)) * ROW_HEIGHT,
              20
            ),
          }}
        >
          <p className="truncate font-semibold">{membersLabel(draggedShift.members)}</p>
          <p className="truncate">{draggedShift.siteLabel}</p>
          <p className="truncate text-[10px] opacity-80">
            {formatTime(liveRange.start)}–{formatTime(liveRange.end)} ·{" "}
            {formatDateLabel(days[liveRange.dayIndex])}
          </p>
        </div>
      )}

      <p className="mt-2 text-xs text-zinc-400">
        Trascina un turno per spostarlo, trascina i bordi superiore/inferiore per
        allungarlo o accorciarlo, clicca per aprirlo in modifica.
      </p>

      {pendingMove && (
        <ShiftConflictDialog
          conflicts={pendingMove.conflicts}
          onCancel={() => setPendingMove(null)}
          onConfirm={confirmPendingMove}
        />
      )}
    </>
  );
}
