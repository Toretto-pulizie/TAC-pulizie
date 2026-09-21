"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { createShift, updateShiftGroup, checkShiftConflicts } from "@/app/actions/shifts";
import { toDateInputValue, formatTime } from "@/lib/dates";
import { ShiftConflictDialog, hasWarnings } from "./ShiftConflictDialog";
import type { ShiftConflicts } from "@/lib/shiftConflicts";
import type { ShiftItem } from "./WeekCalendar";

type QuoteSiteOption = { id: string; ore: number; label: string };
type Site = {
  id: string;
  label: string;
  capienza: number | null;
  quoteSites: QuoteSiteOption[];
};

// "HH:MM" + ore (anche frazionarie) → nuovo "HH:MM", arrotondato al minuto.
function addHoursToTime(time: string, hours: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = ((h * 60 + m + Math.round(hours * 60)) % 1440 + 1440) % 1440;
  const hh = Math.floor(total / 60).toString().padStart(2, "0");
  const mm = (total % 60).toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

export function ShiftForm({
  employees,
  sites,
  occupancy,
  defaultDate,
  editing,
  onDoneEditing,
}: {
  employees: { id: string; name: string }[];
  sites: Site[];
  occupancy: Record<string, Record<string, number>>;
  defaultDate: string;
  editing?: ShiftItem | null;
  onDoneEditing?: () => void;
}) {
  const isEdit = !!editing;
  const [state, formAction, pending] = useActionState(
    isEdit ? updateShiftGroup : createShift,
    undefined
  );
  const formRef = useRef<HTMLFormElement>(null);
  const pendingFormDataRef = useRef<FormData | null>(null);
  const [siteId, setSiteId] = useState(editing?.siteId ?? "");
  const [date, setDate] = useState(editing ? toDateInputValue(editing.start) : defaultDate);
  const [startTime, setStartTime] = useState(editing ? formatTime(editing.start) : "09:00");
  const [endTime, setEndTime] = useState(editing ? formatTime(editing.end) : "12:00");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(
    editing ? editing.members.map((m) => m.userId) : []
  );
  // Ore dell'intervento da dividere tra più collaboratori: se la sede ha
  // preventivi accettati si sceglie quale tra questi (ore non modificabili,
  // vengono dal contratto); altrimenti si inseriscono a mano come ripiego
  // (cantiere senza preventivo collegato).
  const [selectedQuoteSiteId, setSelectedQuoteSiteId] = useState("");
  const [manualOre, setManualOre] = useState("");
  const [checking, startChecking] = useTransition();
  const [pendingConflicts, setPendingConflicts] = useState<ShiftConflicts | null>(null);

  useEffect(() => {
    setSiteId(editing?.siteId ?? "");
    setDate(editing ? toDateInputValue(editing.start) : defaultDate);
    setStartTime(editing ? formatTime(editing.start) : "09:00");
    setEndTime(editing ? formatTime(editing.end) : "12:00");
    setSelectedUserIds(editing ? editing.members.map((m) => m.userId) : []);
    setSelectedQuoteSiteId("");
    setManualOre("");
  }, [editing, defaultDate]);

  useEffect(() => {
    if (state && "success" in state && state.success) {
      formRef.current?.reset();
      setSiteId("");
      setDate(defaultDate);
      setStartTime("09:00");
      setEndTime("12:00");
      setSelectedUserIds([]);
      setSelectedQuoteSiteId("");
      setManualOre("");
      onDoneEditing?.();
    }
  }, [state, defaultDate, onDoneEditing]);

  function toggleUser(id: string) {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
    );
  }

  function handleSiteChange(value: string) {
    setSiteId(value);
    const quoteSites = sites.find((s) => s.id === value)?.quoteSites ?? [];
    // Un solo preventivo accettato per la sede: lo si propone subito. Con
    // più di uno (es. cambiato nel tempo da settimanale a mensile) va
    // scelto esplicitamente, per non indovinare quello sbagliato.
    setSelectedQuoteSiteId(quoteSites.length === 1 ? quoteSites[0].id : "");
    setManualOre("");
  }

  const activeQuoteSites = sites.find((s) => s.id === siteId)?.quoteSites ?? [];
  const selectedQuoteSite = activeQuoteSites.find((q) => q.id === selectedQuoteSiteId);
  const oreNum = selectedQuoteSite
    ? selectedQuoteSite.ore
    : parseFloat(manualOre.replace(",", "."));
  const isMultiAuto = selectedUserIds.length > 1 && !Number.isNaN(oreNum) && oreNum > 0;
  const displayedEndTime = isMultiAuto
    ? addHoursToTime(startTime, oreNum / selectedUserIds.length)
    : endTime;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (isEdit && editing) fd.set("groupId", editing.groupId);
    fd.set("endTime", displayedEndTime);

    const userIds = selectedUserIds;
    const site = String(fd.get("siteId") || "");
    const formDate = String(fd.get("date") || "");
    const start = String(fd.get("startTime") || "");
    const end = String(fd.get("endTime") || "");
    if (userIds.length === 0 || !site || !formDate || !start || !end) {
      startTransition(() => formAction(fd));
      return;
    }

    startChecking(async () => {
      const conflicts = await checkShiftConflicts({
        userIds,
        siteId: site,
        start: new Date(`${formDate}T${start}:00`).toISOString(),
        end: new Date(`${formDate}T${end}:00`).toISOString(),
        excludeShiftIds: editing?.members.map((m) => m.shiftId),
      });
      if (hasWarnings(conflicts)) {
        pendingFormDataRef.current = fd;
        setPendingConflicts(conflicts);
      } else {
        startTransition(() => formAction(fd));
      }
    });
  }

  function confirmPending() {
    const fd = pendingFormDataRef.current;
    setPendingConflicts(null);
    if (fd) startTransition(() => formAction(fd));
  }

  const selectedSite = sites.find((s) => s.id === siteId);
  const currentCount = siteId ? occupancy[siteId]?.[date] ?? 0 : 0;
  const isFull =
    selectedSite?.capienza != null && currentCount >= selectedSite.capienza;

  return (
    <form
      key={editing?.groupId ?? "new"}
      ref={formRef}
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end"
    >
      {isEdit && <p className="w-full text-sm font-medium text-zinc-700">Modifica turno</p>}
      <div className="flex flex-col gap-1 text-sm">
        Collaboratori
        <div className="flex max-w-xs flex-wrap gap-x-3 gap-y-1 rounded-lg border border-zinc-300 px-3 py-2">
          {employees.map((e) => (
            <label key={e.id} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                name="userIds"
                value={e.id}
                checked={selectedUserIds.includes(e.id)}
                onChange={() => toggleUser(e.id)}
              />
              {e.name}
            </label>
          ))}
        </div>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        Cliente / cantiere
        <select
          name="siteId"
          value={siteId}
          onChange={(e) => handleSiteChange(e.target.value)}
          required
          className="rounded-lg border border-zinc-300 px-3 py-2"
        >
          <option value="">Seleziona...</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Data
        <input
          type="date"
          name="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Dalle
        <input
          type="time"
          name="startTime"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          required
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>
      {selectedUserIds.length > 1 && activeQuoteSites.length > 0 && (
        <label className="flex flex-col gap-1 text-sm">
          Preventivo / servizio
          <select
            value={selectedQuoteSiteId}
            onChange={(e) => setSelectedQuoteSiteId(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          >
            <option value="">Seleziona...</option>
            {activeQuoteSites.map((q) => (
              <option key={q.id} value={q.id}>
                {q.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {selectedUserIds.length > 1 && activeQuoteSites.length === 0 && (
        <label className="flex flex-col gap-1 text-sm">
          Ore intervento (totali)
          <input
            type="number"
            step="0.25"
            min="0"
            value={manualOre}
            onChange={(e) => setManualOre(e.target.value)}
            placeholder="es. 6"
            className="w-28 rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
      )}
      <label className="flex flex-col gap-1 text-sm">
        Alle
        <input
          type="time"
          name="endTime"
          value={displayedEndTime}
          onChange={(e) => setEndTime(e.target.value)}
          readOnly={isMultiAuto}
          required
          className={`rounded-lg border border-zinc-300 px-3 py-2 ${
            isMultiAuto ? "bg-zinc-100 text-zinc-500" : ""
          }`}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Note
        <textarea
          name="notes"
          rows={2}
          defaultValue={editing?.notes ?? ""}
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>
      <button
        type="submit"
        disabled={pending || checking}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending || checking ? "Verifica..." : isEdit ? "Salva modifiche" : "Assegna turno"}
      </button>
      {isEdit && (
        <button
          type="button"
          onClick={() => onDoneEditing?.()}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm"
        >
          Annulla modifica
        </button>
      )}
      {selectedUserIds.length > 1 && (
        <p className="w-full text-sm text-zinc-500">
          {isMultiAuto
            ? `${selectedUserIds.length} collaboratori × ${(oreNum / selectedUserIds.length).toFixed(2)}h ciascuno = ${oreNum}h intervento totali.`
            : activeQuoteSites.length > 0
              ? "Seleziona il preventivo/servizio per calcolare automaticamente l'orario di fine di ciascun collaboratore."
              : "Inserisci le ore totali dell'intervento per calcolare automaticamente l'orario di fine di ciascun collaboratore."}
        </p>
      )}
      {selectedSite && (
        <p
          className={`w-full text-sm ${isFull ? "text-red-600" : "text-zinc-500"}`}
        >
          {selectedSite.capienza != null
            ? `Occupazione ${date}: ${currentCount}/${selectedSite.capienza} posti${
                isFull ? " — cantiere al completo, puoi comunque procedere" : ""
              }`
            : `Occupazione ${date}: ${currentCount} persone (nessun limite impostato)`}
        </p>
      )}
      {state && "error" in state && (
        <p className="w-full text-sm text-red-600">{state.error}</p>
      )}

      {pendingConflicts && (
        <ShiftConflictDialog
          conflicts={pendingConflicts}
          onCancel={() => setPendingConflicts(null)}
          onConfirm={confirmPending}
        />
      )}
    </form>
  );
}
