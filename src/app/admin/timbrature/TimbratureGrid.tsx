"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSessionTime, createManualSession } from "@/app/actions/timeEntries";

export type SessionRow = {
  startId: string;
  endId: string | null;
  travelId: string | null;
  userName: string;
  clientName: string | null;
  siteName: string | null;
  dateLabel: string;
  startTime: string;
  endTime: string | null;
  workMinutes: number | null;
  travelMinutes: number;
  gps: boolean;
  note: string;
};

export type EmployeeTotal = {
  userId: string;
  name: string;
  workMinutes: number;
  travelMinutes: number;
};

type GroupKey = "dipendente" | "cliente" | "sede";

const GROUP_LABELS: Record<GroupKey, string> = {
  dipendente: "Dipendente",
  cliente: "Cliente",
  sede: "Sede",
};

function groupValue(s: SessionRow, group: GroupKey): string {
  if (group === "dipendente") return s.userName;
  if (group === "cliente") return s.clientName ?? "—";
  return s.siteName ?? "—";
}

function formatHM(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

// Accetta "2:30" (ore:minuti) o un numero semplice di minuti (es. "150").
function parseDurationMinutes(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.includes(":")) {
    const [h, m] = trimmed.split(":").map((n) => Number(n));
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  }
  const n = Number(trimmed.replace(",", "."));
  return Number.isNaN(n) ? null : Math.round(n);
}

function minutesToHM(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

function addMinutesToTime(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(((total % 1440) + 1440) % 1440 / 60);
  const nm = ((total % 1440) + 1440) % 1440 % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

type EditingField = "start" | "end" | "work" | "travel" | "note";
type EditingState = { startId: string; field: EditingField; value: string } | null;

export function TimbratureGrid({
  sessions,
  employeeTotals,
  employees,
  sites,
}: {
  sessions: SessionRow[];
  employeeTotals: EmployeeTotal[];
  employees: { id: string; name: string }[];
  sites: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [group, setGroup] = useState<GroupKey>("dipendente");
  const [editing, setEditing] = useState<EditingState>(null);
  const [error, setError] = useState<string | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, SessionRow[]>();
    for (const s of sessions) {
      const key = groupValue(s, group);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], "it"));
  }, [sessions, group]);

  function openEdit(s: SessionRow, field: EditingField) {
    setError(null);
    const value =
      field === "start"
        ? s.startTime
        : field === "end"
          ? (s.endTime ?? "")
          : field === "work"
            ? (s.workMinutes != null ? minutesToHM(s.workMinutes) : "")
            : field === "travel"
              ? (s.travelMinutes ? String(s.travelMinutes) : "")
              : s.note;
    setEditing({ startId: s.startId, field, value });
  }

  function commitEdit(s: SessionRow) {
    if (!editing || editing.startId !== s.startId) return;
    const field = editing.field;
    const value = editing.value;
    setEditing(null);

    let startTime = s.startTime;
    let endTime = s.endTime;
    let travelMinutes = s.travelMinutes;
    let note = s.note;

    if (field === "start") startTime = value;
    if (field === "end") endTime = value || null;
    if (field === "note") note = value;
    if (field === "work") {
      const mins = parseDurationMinutes(value);
      if (mins == null) {
        setError("Durata non valida (usa es. 2:30 oppure 150)");
        return;
      }
      endTime = addMinutesToTime(startTime, mins);
    }
    if (field === "travel") {
      const mins = value.trim() === "" ? 0 : parseDurationMinutes(value);
      if (mins == null) {
        setError("Spostamento non valido");
        return;
      }
      travelMinutes = mins;
    }

    if (
      startTime === s.startTime &&
      endTime === s.endTime &&
      travelMinutes === s.travelMinutes &&
      note === s.note
    ) {
      return;
    }

    startTransition(async () => {
      const result = await updateSessionTime({
        startId: s.startId,
        endId: s.endId,
        travelId: s.travelId,
        startTime,
        endTime,
        travelMinutes,
        note,
      });
      if (result && "error" in result) {
        setError(result.error ?? "Errore durante il salvataggio");
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {employeeTotals.map((e) => (
          <div key={e.userId} className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
            <p className="text-xs font-semibold text-zinc-500">{e.name}</p>
            <p className="mt-1 text-base font-semibold text-zinc-900">
              {formatHM(e.workMinutes)}
            </p>
            <p className="text-xs text-zinc-400">spostamento {formatHM(e.travelMinutes)}</p>
          </div>
        ))}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
            Raggruppa per
          </span>
          <div className="inline-flex gap-0.5 rounded-lg border border-zinc-300 bg-white p-0.5">
            {(Object.keys(GROUP_LABELS) as GroupKey[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGroup(g)}
                className={`rounded-md px-3 py-1 text-xs font-semibold ${
                  group === g ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100"
                }`}
              >
                {GROUP_LABELS[g]}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-zinc-400">
            {isPending ? "Salvataggio..." : "Clic su un valore per modificarlo"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowManualForm((v) => !v)}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
        >
          {showManualForm ? "✕ Chiudi" : "+ Aggiungi timbratura manuale"}
        </button>
      </div>

      {showManualForm && (
        <ManualSessionForm
          employees={employees}
          sites={sites}
          onCreated={() => {
            setShowManualForm(false);
            router.refresh();
          }}
        />
      )}

      <section className="overflow-x-auto rounded-xl border border-zinc-200 bg-white [contain:inline-size]">
        <table className="w-full min-w-[980px] border-collapse text-left text-xs">
          <thead className="border-b border-zinc-300 bg-zinc-100 text-zinc-500">
            <tr>
              {[
                "Collaboratore",
                "Cliente",
                "Sede",
                "Data",
                "Inizio",
                "Fine",
                "Ore lavoro",
                "Spost.",
                "GPS",
                "Note",
              ].map((h) => (
                <th key={h} className="border-r border-zinc-200 px-2.5 py-1.5 font-semibold last:border-r-0">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grouped.map(([key, rows]) => (
              <GroupBlock
                key={key}
                groupKey={key}
                rows={rows}
                editing={editing}
                onOpenEdit={openEdit}
                onChangeEdit={(v) => setEditing((prev) => (prev ? { ...prev, value: v } : prev))}
                onCommit={commitEdit}
                onCancel={() => setEditing(null)}
              />
            ))}
            {sessions.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-zinc-400">
                  Nessuna timbratura nel periodo selezionato.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function ManualSessionForm({
  employees,
  sites,
  onCreated,
}: {
  employees: { id: string; name: string }[];
  sites: { id: string; label: string }[];
  onCreated: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    const userId = String(formData.get("userId") || "");
    const siteId = String(formData.get("siteId") || "");
    const date = String(formData.get("date") || "");
    const startTime = String(formData.get("startTime") || "");
    const oreLavorate = String(formData.get("oreLavorate") || "").trim();
    let endTime = String(formData.get("endTime") || "").trim();
    const travelMinutes = Number(formData.get("travelMinutes") || 0);
    const note = String(formData.get("note") || "");

    if (!userId || !siteId || !date || !startTime) {
      setError("Compila collaboratore, sede, data e inizio");
      return;
    }

    // Se non si conosce l'orario di fine esatto, basta indicare le ore
    // lavorate: la fine si calcola da sola a partire dall'inizio.
    if (!endTime) {
      if (!oreLavorate) {
        setError("Indica l'orario di fine oppure le ore lavorate");
        return;
      }
      const mins = parseDurationMinutes(oreLavorate);
      if (mins == null || mins <= 0) {
        setError("Ore lavorate non valide (usa es. 2:30 oppure 150)");
        return;
      }
      endTime = addMinutesToTime(startTime, mins);
    }

    startTransition(async () => {
      const result = await createManualSession({
        userId,
        siteId,
        date,
        startTime,
        endTime,
        travelMinutes,
        note,
      });
      if (result && "error" in result) {
        setError(result.error ?? "Errore durante il salvataggio");
      } else {
        onCreated();
      }
    });
  }

  return (
    <form
      action={handleSubmit}
      className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-3"
    >
      <label className="flex flex-col gap-1 text-xs">
        Collaboratore
        <select name="userId" required className="rounded-lg border border-zinc-300 px-2.5 py-1.5 text-sm">
          <option value="">Seleziona...</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-w-[14rem] flex-col gap-1 text-xs">
        Sede
        <select name="siteId" required className="rounded-lg border border-zinc-300 px-2.5 py-1.5 text-sm">
          <option value="">Seleziona...</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs">
        Data
        <input type="date" name="date" required className="rounded-lg border border-zinc-300 px-2.5 py-1.5 text-sm" />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        Inizio
        <input type="time" name="startTime" required className="rounded-lg border border-zinc-300 px-2.5 py-1.5 text-sm" />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        Fine (se nota)
        <input type="time" name="endTime" className="rounded-lg border border-zinc-300 px-2.5 py-1.5 text-sm" />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        oppure Ore lavorate
        <input
          type="text"
          name="oreLavorate"
          placeholder="es. 2:30 o 150"
          className="w-28 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        Spostamento (min)
        <input
          type="number"
          name="travelMinutes"
          min="0"
          defaultValue={0}
          className="w-24 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-sm"
        />
      </label>
      <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs">
        Note (opzionale)
        <input type="text" name="note" className="rounded-lg border border-zinc-300 px-2.5 py-1.5 text-sm" />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? "Salvataggio..." : "Aggiungi"}
      </button>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </form>
  );
}

function GroupBlock({
  groupKey,
  rows,
  editing,
  onOpenEdit,
  onChangeEdit,
  onCommit,
  onCancel,
}: {
  groupKey: string;
  rows: SessionRow[];
  editing: EditingState;
  onOpenEdit: (s: SessionRow, field: EditingField) => void;
  onChangeEdit: (value: string) => void;
  onCommit: (s: SessionRow) => void;
  onCancel: () => void;
}) {
  function editableCell(s: SessionRow, field: EditingField, display: React.ReactNode, inputType: "time" | "text" = "text", width = "w-[76px]") {
    const isEditing = editing?.startId === s.startId && editing.field === field;
    if (isEditing) {
      return (
        <input
          type={inputType}
          autoFocus
          value={editing!.value}
          onChange={(e) => onChangeEdit(e.target.value)}
          onBlur={() => onCommit(s)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onCommit(s);
            if (e.key === "Escape") onCancel();
          }}
          className={`${width} rounded border border-blue-400 px-1 py-0.5 text-xs`}
        />
      );
    }
    return (
      <span
        onClick={() => onOpenEdit(s, field)}
        className="-mx-1 cursor-text rounded px-1 hover:border hover:border-zinc-300"
      >
        {display}
      </span>
    );
  }

  return (
    <>
      <tr className="bg-zinc-50">
        <td colSpan={10} className="border-b border-t border-zinc-300 px-2.5 py-1.5 text-[11px] font-bold text-zinc-700">
          {groupKey}{" "}
          <span className="font-normal text-zinc-400">
            — {rows.length} {rows.length === 1 ? "sessione" : "sessioni"}
          </span>
        </td>
      </tr>
      {rows.map((s) => {
        const isEditingNote = editing?.startId === s.startId && editing.field === "note";
        return (
          <tr key={s.startId} className="border-b border-zinc-100 last:border-0 even:bg-zinc-50/50 hover:bg-blue-50/40">
            <td className="border-r border-zinc-100 px-2.5 py-1.5 font-semibold text-zinc-900">
              {s.userName}
            </td>
            <td className="border-r border-zinc-100 px-2.5 py-1.5 text-zinc-500">
              {s.clientName ?? "—"}
            </td>
            <td className="border-r border-zinc-100 px-2.5 py-1.5 text-zinc-500">
              {s.siteName ?? "—"}
            </td>
            <td className="border-r border-zinc-100 px-2.5 py-1.5 text-zinc-500">{s.dateLabel}</td>
            <td className="border-r border-zinc-100 px-2.5 py-1.5">
              {editableCell(s, "start", s.startTime, "time")}
            </td>
            <td className="border-r border-zinc-100 px-2.5 py-1.5">
              {editableCell(s, "end", s.endTime ?? "—", "time")}
            </td>
            <td className="border-r border-zinc-100 px-2.5 py-1.5">
              {editableCell(
                s,
                "work",
                s.workMinutes != null ? (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                    {formatHM(s.workMinutes)}
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                    In corso
                  </span>
                ),
                "text",
                "w-[64px]"
              )}
            </td>
            <td className="border-r border-zinc-100 px-2.5 py-1.5 text-zinc-500">
              {editableCell(s, "travel", s.travelMinutes ? `${s.travelMinutes}m` : "—", "text", "w-[56px]")}
            </td>
            <td className="border-r border-zinc-100 px-2.5 py-1.5">
              {s.gps ? (
                <span className="font-semibold text-green-700">✓</span>
              ) : (
                <span className="text-zinc-300">—</span>
              )}
            </td>
            <td className="px-2.5 py-1.5 text-zinc-500 italic">
              {isEditingNote ? (
                <input
                  type="text"
                  autoFocus
                  value={editing!.value}
                  onChange={(e) => onChangeEdit(e.target.value)}
                  onBlur={() => onCommit(s)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onCommit(s);
                    if (e.key === "Escape") onCancel();
                  }}
                  className="w-full min-w-[140px] rounded border border-blue-400 px-1 py-0.5 text-xs not-italic"
                />
              ) : (
                <span
                  onClick={() => onOpenEdit(s, "note")}
                  className="-mx-1 block cursor-text rounded px-1 hover:border hover:border-zinc-300"
                >
                  {s.note || "—"}
                </span>
              )}
            </td>
          </tr>
        );
      })}
    </>
  );
}
