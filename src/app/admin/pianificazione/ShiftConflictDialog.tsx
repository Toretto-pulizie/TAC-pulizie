"use client";

import { useState, useTransition } from "react";
import { moveShift } from "@/app/actions/shifts";
import { formatDateLabel, formatTime, toDateInputValue } from "@/lib/dates";
import type { ShiftConflicts } from "@/lib/shiftConflicts";

const BUDGET_LABELS: Record<string, string> = {
  PASS_SETTIMANALE: "questa settimana",
  PASS_MENSILE: "questo mese",
  ONE_SHOT: "in totale",
};

// Vero se c'è qualcosa di rilevante da mostrare all'amministratore prima di
// scrivere un turno (nuovo, spostato o ridimensionato) — nessuno di questi
// avvisi è bloccante, servono solo a decidere con più informazioni.
export function hasWarnings(conflicts: ShiftConflicts) {
  return (
    conflicts.overlaps.length > 0 ||
    (conflicts.capacityWarning != null &&
      conflicts.capacityWarning.current >= conflicts.capacityWarning.capienza) ||
    (conflicts.budgetWarning != null &&
      conflicts.budgetWarning.pianificate > conflicts.budgetWarning.contrattuali) ||
    conflicts.distanceInfos.length > 0
  );
}

export function ShiftConflictDialog({
  conflicts,
  onConfirm,
  onCancel,
}: {
  conflicts: ShiftConflicts;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [drafts, setDrafts] = useState<
    Record<string, { date: string; startTime: string; endTime: string }>
  >({});

  const pendingOverlaps = conflicts.overlaps.filter((o) => !resolvedIds.has(o.id));
  const budget = conflicts.budgetWarning;
  const overBudget = budget != null && budget.pianificate > budget.contrattuali;
  const capacity = conflicts.capacityWarning;
  const isFull = capacity != null && capacity.current >= capacity.capienza;

  function draftFor(id: string, start: Date, end: Date) {
    return (
      drafts[id] ?? {
        date: toDateInputValue(start),
        startTime: formatTime(start),
        endTime: formatTime(end),
      }
    );
  }

  function handleMove(id: string, groupId: string, start: Date, end: Date) {
    const draft = draftFor(id, start, end);
    const newStart = new Date(`${draft.date}T${draft.startTime}:00`);
    const newEnd = new Date(`${draft.date}T${draft.endTime}:00`);
    startTransition(async () => {
      const res = await moveShift({
        groupId,
        start: newStart.toISOString(),
        end: newEnd.toISOString(),
      });
      if (res && "success" in res) {
        setResolvedIds((prev) => new Set(prev).add(id));
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-semibold text-zinc-900">Verifica prima di confermare</h2>

        {pendingOverlaps.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-zinc-600">
              Uno o più collaboratori hanno già un turno che si sovrappone. Puoi spostarlo qui
              su due piedi, oppure sovrapporlo comunque.
            </p>
            {pendingOverlaps.map((o) => {
              const draft = draftFor(o.id, o.start, o.end);
              return (
                <div
                  key={o.id}
                  className="flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm"
                >
                  <p className="font-medium text-amber-900">
                    {o.employeeName} · {o.siteLabel} · {formatDateLabel(o.start)}{" "}
                    {formatTime(o.start)}–{formatTime(o.end)}
                  </p>
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="flex flex-col gap-1 text-xs">
                      Nuova data
                      <input
                        type="date"
                        value={draft.date}
                        onChange={(e) =>
                          setDrafts((d) => ({ ...d, [o.id]: { ...draft, date: e.target.value } }))
                        }
                        className="rounded border border-zinc-300 px-2 py-1"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs">
                      Dalle
                      <input
                        type="time"
                        value={draft.startTime}
                        onChange={(e) =>
                          setDrafts((d) => ({
                            ...d,
                            [o.id]: { ...draft, startTime: e.target.value },
                          }))
                        }
                        className="rounded border border-zinc-300 px-2 py-1"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs">
                      Alle
                      <input
                        type="time"
                        value={draft.endTime}
                        onChange={(e) =>
                          setDrafts((d) => ({ ...d, [o.id]: { ...draft, endTime: e.target.value } }))
                        }
                        className="rounded border border-zinc-300 px-2 py-1"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleMove(o.id, o.groupId, o.start, o.end)}
                      className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                    >
                      Sposta questo turno qui
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {resolvedIds.size > 0 && pendingOverlaps.length === 0 && (
          <p className="text-sm text-green-700">Conflitto risolto — puoi procedere.</p>
        )}

        {capacity && (
          <p className={`text-sm ${isFull ? "text-red-600" : "text-zinc-500"}`}>
            Occupazione cantiere: {capacity.current}/{capacity.capienza} posti
            {isFull ? " — al completo" : ""}
          </p>
        )}

        {budget && (
          <p className={`text-sm ${overBudget ? "text-red-600" : "text-zinc-500"}`}>
            Ore pianificate {BUDGET_LABELS[budget.tipo]}: {budget.pianificate.toFixed(1)}h /{" "}
            {budget.contrattuali.toFixed(1)}h contrattuali
            {overBudget ? " — oltre il monte ore" : ""}
          </p>
        )}

        {conflicts.distanceInfos.map((d) => (
          <p key={d.userId} className="text-sm text-zinc-500">
            {d.employeeName}: ~{d.km.toFixed(1)} km da un altro turno dello stesso giorno (
            {d.altraSedeLabel})
          </p>
        ))}

        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
          >
            {pendingOverlaps.length > 0 ? "Sovrapponi comunque" : "Conferma"}
          </button>
        </div>
      </div>
    </div>
  );
}
