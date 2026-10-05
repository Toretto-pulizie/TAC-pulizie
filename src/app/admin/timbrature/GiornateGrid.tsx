"use client";

import { useState, useTransition } from "react";
import { Trunc } from "@/app/Trunc";
import { useRouter } from "next/navigation";
import { updateDayBoundary, deletePause } from "@/app/actions/timeEntries";

export type GiornataRow = {
  key: string;
  userId: string;
  userName: string;
  dateValue: string;
  dateLabel: string;
  startId: string | null;
  startTime: string | null;
  endId: string | null;
  endTime: string | null;
  pauses: { startId: string; endId: string | null; from: string; to: string | null }[];
  pauseMinutes: number;
  presenceMinutes: number | null;
  open: boolean;
};

type Editing = { key: string; kind: "start" | "end"; value: string } | null;

function formatHM(minutes: number) {
  const total = Math.max(0, Math.round(minutes));
  return `${Math.floor(total / 60)}h ${String(total % 60).padStart(2, "0")}m`;
}

export function GiornateGrid({ rows }: { rows: GiornataRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Editing>(null);
  const [error, setError] = useState<string | null>(null);

  function openEdit(row: GiornataRow, kind: "start" | "end") {
    setError(null);
    setEditing({
      key: row.key,
      kind,
      value: (kind === "start" ? row.startTime : row.endTime) ?? "",
    });
  }

  function commit(row: GiornataRow) {
    if (!editing || editing.key !== row.key) return;
    const { kind, value } = editing;
    setEditing(null);

    const current = (kind === "start" ? row.startTime : row.endTime) ?? "";
    if (value === current) return;
    // Lasciare vuota una cella che era già vuota è solo un annulla.
    if (!value && !current) return;

    startTransition(async () => {
      const result = await updateDayBoundary({
        userId: row.userId,
        date: row.dateValue,
        kind,
        time: value,
        entryId: kind === "start" ? row.startId : row.endId,
      });
      if (result && "error" in result) {
        setError(result.error ?? "Errore durante il salvataggio");
      } else {
        router.refresh();
      }
    });
  }

  function handleDeletePause(startId: string, endId: string | null) {
    if (!confirm("Eliminare questa pausa? L'operazione non è reversibile.")) return;
    startTransition(async () => {
      await deletePause({ startId, endId });
      router.refresh();
    });
  }

  function timeCell(row: GiornataRow, kind: "start" | "end") {
    const isEditing = editing?.key === row.key && editing.kind === kind;
    if (isEditing) {
      return (
        <input
          type="time"
          autoFocus
          value={editing.value}
          onChange={(e) => setEditing((prev) => (prev ? { ...prev, value: e.target.value } : prev))}
          onBlur={() => commit(row)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit(row);
            if (e.key === "Escape") setEditing(null);
          }}
          className="w-[84px] rounded border border-blue-400 px-1 py-0.5 text-xs"
        />
      );
    }
    const time = kind === "start" ? row.startTime : row.endTime;
    const missing = kind === "start" ? "manca" : "aperta";
    return (
      <span
        onClick={() => openEdit(row, kind)}
        className="-mx-1 cursor-text rounded px-1 hover:border hover:border-zinc-300"
      >
        {time ?? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
            {missing} — imposta
          </span>
        )}
      </span>
    );
  }

  return (
    <section className="flex flex-col gap-2">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Giornate</h2>
        <p className="text-[11px] text-zinc-400">
          {isPending
            ? "Salvataggio..."
            : "Da Inizio a Fine giornata, pause escluse, si calcolano le ore di Presenze. Clic su Inizio o Fine per correggerli."}
        </p>
      </div>
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[720px] border-collapse text-left text-xs">
          <thead className="border-b border-zinc-300 bg-zinc-100 text-zinc-500">
            <tr>
              {["Collaboratore", "Data", "Inizio giornata", "Fine giornata", "Pause", "Ore presenza"].map((h) => (
                <th key={h} className="border-r border-zinc-200 px-2.5 py-1.5 font-semibold last:border-r-0">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-zinc-100 last:border-0 hover:bg-blue-50/40">
                <td className="border-r border-zinc-100 px-2.5 py-1.5 font-semibold text-zinc-900">
                  <Trunc text={r.userName} />
                </td>
                <td className="border-r border-zinc-100 px-2.5 py-1.5 text-zinc-500">{r.dateLabel}</td>
                <td className="border-r border-zinc-100 px-2.5 py-1.5">{timeCell(r, "start")}</td>
                <td className="border-r border-zinc-100 px-2.5 py-1.5">{timeCell(r, "end")}</td>
                <td className="border-r border-zinc-100 px-2.5 py-1.5 text-zinc-600">
                  {r.pauses.length === 0 ? (
                    "—"
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      {r.pauses.map((p) => (
                        <span key={p.startId} className="flex items-center gap-1.5">
                          {p.from}–{p.to ?? "in corso"}
                          <button
                            type="button"
                            onClick={() => handleDeletePause(p.startId, p.endId)}
                            disabled={isPending}
                            className="text-zinc-400 hover:text-red-600 disabled:opacity-50"
                            title="Elimina pausa"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                      <span className="text-[11px] text-zinc-400">tot. {formatHM(r.pauseMinutes)}</span>
                    </div>
                  )}
                </td>
                <td className="px-2.5 py-1.5">
                  {r.presenceMinutes == null ? (
                    "—"
                  ) : (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        r.open ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                      }`}
                      title={r.open ? "Stima: la giornata non ha ancora una Fine giornata" : undefined}
                    >
                      {r.open ? "~ " : ""}
                      {formatHM(r.presenceMinutes)}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
