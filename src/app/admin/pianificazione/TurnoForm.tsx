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
import { createShiftPlan, deleteShiftPlans } from "@/app/actions/shiftPlans";
import { toDateInputValue, formatTime } from "@/lib/dates";
import { ShiftConflictDialog, hasWarnings } from "./ShiftConflictDialog";
import type { ShiftConflicts } from "@/lib/shiftConflicts";
import type { ShiftItem } from "./WeekCalendar";

const WEEKDAYS = [
  { label: "Lun", value: 1 },
  { label: "Mar", value: 2 },
  { label: "Mer", value: 3 },
  { label: "Gio", value: 4 },
  { label: "Ven", value: 5 },
  { label: "Sab", value: 6 },
  { label: "Dom", value: 0 },
];

type QuoteSiteOption = { id: string; ore: number; label: string };
type Site = {
  id: string;
  label: string;
  capienza: number | null;
  quoteSites: QuoteSiteOption[];
};
type ContinuativoOption = {
  id: string;
  siteId: string;
  label: string;
  serviceType: "ONE_SHOT" | "PASS_SETTIMANALE" | "PASS_MENSILE";
  ore: number;
};
type FrequenzaLabels = { settimanale: string; mensile: string };

// "HH:MM" + ore (anche frazionarie) → nuovo "HH:MM", arrotondato al minuto.
function addHoursToTime(time: string, hours: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = ((h * 60 + m + Math.round(hours * 60)) % 1440 + 1440) % 1440;
  const hh = Math.floor(total / 60).toString().padStart(2, "0");
  const mm = (total % 60).toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

// Prima data ≥ dataInizio il cui giorno della settimana è tra quelli scelti
// — usata solo per verificare i conflitti sulla prima occorrenza del piano
// prima di crearlo (le occorrenze successive vengono generate dal cron e
// possono comunque essere verificate/spostate dal calendario).
function firstOccurrence(dataInizio: string, daysOfWeek: number[]): Date {
  const start = new Date(`${dataInizio}T00:00:00`);
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    if (daysOfWeek.includes(d.getDay())) return d;
  }
  return start;
}

export function TurnoForm({
  employees,
  sites,
  quoteSites,
  frequenzaLabels,
  occupancy,
  defaultDate,
  editing,
  onDone,
}: {
  employees: { id: string; name: string }[];
  sites: Site[];
  quoteSites: ContinuativoOption[];
  frequenzaLabels: FrequenzaLabels;
  occupancy: Record<string, Record<string, number>>;
  defaultDate: string;
  editing?: ShiftItem | null;
  onDone?: () => void;
}) {
  const isEdit = !!editing;
  const [mode, setMode] = useState<"SINGOLO" | "RICORRENTE">("SINGOLO");
  const isRicorrente = !isEdit && mode === "RICORRENTE";

  const currentAction = isEdit ? updateShiftGroup : isRicorrente ? createShiftPlan : createShift;
  const [state, formAction, pending] = useActionState(currentAction, undefined);

  const formRef = useRef<HTMLFormElement>(null);
  const pendingFormDataRef = useRef<FormData | null>(null);

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(
    editing ? editing.members.map((m) => m.userId) : []
  );
  const [siteId, setSiteId] = useState(editing?.siteId ?? "");
  const [startTime, setStartTime] = useState(editing ? formatTime(editing.start) : "09:00");
  const [endTime, setEndTime] = useState(editing ? formatTime(editing.end) : "12:00");
  // Ore dell'intervento da dividere tra più collaboratori (turno singolo /
  // modifica): se la sede ha preventivi accettati si sceglie quale tra
  // questi (ore non modificabili), altrimenti si inseriscono a mano.
  const [selectedQuoteSiteId, setSelectedQuoteSiteId] = useState("");
  const [manualOre, setManualOre] = useState("");

  // Solo turno singolo/modifica.
  const [date, setDate] = useState(editing ? toDateInputValue(editing.start) : defaultDate);

  // Solo turno ricorrente.
  const [quoteSiteId, setQuoteSiteId] = useState("");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [cadenzaUnit, setCadenzaUnit] = useState<"SETTIMANE" | "MESI">("SETTIMANE");
  const [cadenzaN, setCadenzaN] = useState(1);
  const [dataInizio, setDataInizio] = useState(toDateInputValue(new Date()));

  const [checking, startChecking] = useTransition();
  const [pendingConflicts, setPendingConflicts] = useState<ShiftConflicts | null>(null);
  const [deletingPlan, startDeletingPlan] = useTransition();

  // Se anche un solo collaboratore di questo turno viene da un piano
  // ricorrente, permettiamo di eliminare anche quello (non solo questa
  // occorrenza) — un piano per collaboratore, deduplicati.
  const planIds = editing
    ? Array.from(
        new Set(editing.members.map((m) => m.planId).filter((id): id is string => !!id))
      )
    : [];

  useEffect(() => {
    setSiteId(editing?.siteId ?? "");
    setDate(editing ? toDateInputValue(editing.start) : defaultDate);
    setStartTime(editing ? formatTime(editing.start) : "09:00");
    setEndTime(editing ? formatTime(editing.end) : "12:00");
    setSelectedUserIds(editing ? editing.members.map((m) => m.userId) : []);
    setSelectedQuoteSiteId("");
    setManualOre("");
    setMode("SINGOLO");
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
      setQuoteSiteId("");
      setSelectedDays([]);
      setCadenzaUnit("SETTIMANE");
      setCadenzaN(1);
      setDataInizio(toDateInputValue(new Date()));
      setMode("SINGOLO");
      onDone?.();
    }
  }, [state, defaultDate, onDone]);

  function toggleUser(id: string) {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
    );
  }

  function toggleDay(day: number) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  function handleQuoteSiteChange(id: string) {
    setQuoteSiteId(id);
    const qs = quoteSites.find((q) => q.id === id);
    if (qs) setSiteId(qs.siteId);
  }

  function handleSiteChange(value: string) {
    setSiteId(value);
    const siteQuoteSites = sites.find((s) => s.id === value)?.quoteSites ?? [];
    // Un solo preventivo accettato per la sede: lo si propone subito. Con
    // più di uno (es. cambiato nel tempo da settimanale a mensile) va
    // scelto esplicitamente, per non indovinare quello sbagliato.
    setSelectedQuoteSiteId(siteQuoteSites.length === 1 ? siteQuoteSites[0].id : "");
    const continuativeMatches = quoteSites.filter((q) => q.siteId === value);
    setQuoteSiteId(continuativeMatches.length === 1 ? continuativeMatches[0].id : "");
    setManualOre("");
  }

  const activeQuoteSites = sites.find((s) => s.id === siteId)?.quoteSites ?? [];
  const selectedQuoteSite = activeQuoteSites.find((q) => q.id === selectedQuoteSiteId);
  const activeQuoteSite = quoteSites.find((q) => q.id === quoteSiteId);

  const oreNum = isRicorrente
    ? activeQuoteSite
      ? activeQuoteSite.ore
      : parseFloat(manualOre.replace(",", "."))
    : selectedQuoteSite
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
    if (isRicorrente) fd.set("note", String(fd.get("notes") ?? ""));

    const userIds = selectedUserIds;

    if (isRicorrente) {
      if (
        userIds.length === 0 ||
        !siteId ||
        selectedDays.length === 0 ||
        !dataInizio ||
        !startTime ||
        !displayedEndTime
      ) {
        startTransition(() => formAction(fd));
        return;
      }
      const occDate = toDateInputValue(firstOccurrence(dataInizio, selectedDays));
      startChecking(async () => {
        const conflicts = await checkShiftConflicts({
          userIds,
          siteId,
          start: new Date(`${occDate}T${startTime}:00`).toISOString(),
          end: new Date(`${occDate}T${displayedEndTime}:00`).toISOString(),
        });
        if (hasWarnings(conflicts)) {
          pendingFormDataRef.current = fd;
          setPendingConflicts(conflicts);
        } else {
          startTransition(() => formAction(fd));
        }
      });
      return;
    }

    if (userIds.length === 0 || !siteId || !date || !startTime || !displayedEndTime) {
      startTransition(() => formAction(fd));
      return;
    }
    startChecking(async () => {
      const conflicts = await checkShiftConflicts({
        userIds,
        siteId,
        start: new Date(`${date}T${startTime}:00`).toISOString(),
        end: new Date(`${date}T${displayedEndTime}:00`).toISOString(),
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
      className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-700">
          {isEdit ? "Modifica turno" : "Nuovo turno"}
        </p>
        <div className="flex items-center gap-3">
          {!isEdit && (
            <div className="flex overflow-hidden rounded-lg border border-zinc-300 text-sm">
              <button
                type="button"
                onClick={() => setMode("SINGOLO")}
                className={`px-3 py-1.5 ${mode === "SINGOLO" ? "bg-zinc-900 text-white" : "text-zinc-600"}`}
              >
                Singolo
              </button>
              <button
                type="button"
                onClick={() => setMode("RICORRENTE")}
                className={`px-3 py-1.5 ${mode === "RICORRENTE" ? "bg-zinc-900 text-white" : "text-zinc-600"}`}
              >
                Ricorrente
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => onDone?.()}
            aria-label="Chiudi"
            className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          >
            ✕
          </button>
        </div>
      </div>

      {isRicorrente && quoteSites.length > 0 && (
        <label className="flex flex-col gap-1 text-sm">
          Da preventivo continuativo (opzionale)
          <select
            name="quoteSiteId"
            value={quoteSiteId}
            onChange={(e) => handleQuoteSiteChange(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          >
            <option value="">— Nessuno —</option>
            {quoteSites.map((qs) => (
              <option key={qs.id} value={qs.id}>
                {qs.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="flex flex-wrap items-end gap-3">
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
        {!isRicorrente && (
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
        )}
      </div>

      {isRicorrente && (
        <div className="flex flex-col gap-1 text-sm">
          Giorni della settimana
          <div className="flex flex-wrap gap-3">
            {WEEKDAYS.map((wd) => (
              <label key={wd.value} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  name="daysOfWeek"
                  value={wd.value}
                  checked={selectedDays.includes(wd.value)}
                  onChange={() => toggleDay(wd.value)}
                />
                {wd.label}
              </label>
            ))}
          </div>
        </div>
      )}

      {isRicorrente &&
        (activeQuoteSite ? (
          // La cadenza si deduce dal preventivo collegato: niente da
          // mostrare o far scegliere, si invia comunque il valore corretto.
          activeQuoteSite.serviceType === "PASS_MENSILE" ? (
            <input type="hidden" name="intervalDays" value={30} />
          ) : (
            <input type="hidden" name="intervalWeeks" value={1} />
          )
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-sm">
                Cadenza
                <select
                  value={cadenzaUnit}
                  onChange={(e) => setCadenzaUnit(e.target.value as "SETTIMANE" | "MESI")}
                  className="rounded-lg border border-zinc-300 px-3 py-2"
                >
                  <option value="SETTIMANE">{frequenzaLabels.settimanale}</option>
                  <option value="MESI">{frequenzaLabels.mensile}</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Ogni quant{cadenzaUnit === "MESI" ? "i mesi" : "e settimane"}
                <input
                  type="number"
                  min={1}
                  max={cadenzaUnit === "MESI" ? 24 : 52}
                  value={cadenzaN}
                  onChange={(e) => setCadenzaN(Number(e.target.value))}
                  className="w-24 rounded-lg border border-zinc-300 px-3 py-2"
                />
              </label>
              {cadenzaUnit === "MESI" && (
                <p className="pb-2 text-xs text-zinc-400">
                  Mese standard di 30 giorni: si piazza nel primo giorno
                  scelto sopra a partire da ogni traguardo di {cadenzaN * 30}{" "}
                  giorni.
                </p>
              )}
            </div>
            {cadenzaUnit === "SETTIMANE" ? (
              <input type="hidden" name="intervalWeeks" value={cadenzaN} />
            ) : (
              <input type="hidden" name="intervalDays" value={cadenzaN * 30} />
            )}
          </>
        ))}

      <div className="flex flex-wrap items-end gap-3">
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
        {!isRicorrente && selectedUserIds.length > 1 && activeQuoteSites.length > 0 && (
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
        {((!isRicorrente && selectedUserIds.length > 1 && activeQuoteSites.length === 0) ||
          (isRicorrente && !activeQuoteSite)) && (
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
        {isRicorrente && (
          <>
            <label className="flex flex-col gap-1 text-sm">
              Data inizio
              <input
                type="date"
                name="dataInizio"
                value={dataInizio}
                onChange={(e) => setDataInizio(e.target.value)}
                required
                className="rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Data fine (opzionale)
              <input
                type="date"
                name="dataFine"
                className="rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
          </>
        )}
      </div>

      {selectedUserIds.length > 1 && (
        <p className="w-full text-sm text-zinc-500">
          {isMultiAuto
            ? `${selectedUserIds.length} collaboratori × ${(oreNum / selectedUserIds.length).toFixed(2)}h ciascuno = ${oreNum}h intervento totali${isRicorrente ? ", ad ogni occorrenza." : "."}`
            : isRicorrente
              ? quoteSites.some((q) => q.siteId === siteId)
                ? "Scegli il preventivo continuativo qui sopra per calcolare automaticamente l'orario di fine di ciascun collaboratore."
                : "Inserisci le ore totali dell'intervento per calcolare automaticamente l'orario di fine di ciascun collaboratore."
              : activeQuoteSites.length > 0
                ? "Seleziona il preventivo/servizio per calcolare automaticamente l'orario di fine di ciascun collaboratore."
                : "Inserisci le ore totali dell'intervento per calcolare automaticamente l'orario di fine di ciascun collaboratore."}
        </p>
      )}

      {!isRicorrente && selectedSite && (
        <p className={`w-full text-sm ${isFull ? "text-red-600" : "text-zinc-500"}`}>
          {selectedSite.capienza != null
            ? `Occupazione ${date}: ${currentCount}/${selectedSite.capienza} posti${
                isFull ? " — cantiere al completo, puoi comunque procedere" : ""
              }`
            : `Occupazione ${date}: ${currentCount} persone (nessun limite impostato)`}
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm">
        Note
        <textarea
          name="notes"
          rows={2}
          defaultValue={editing?.notes ?? ""}
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending || checking}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending || checking
            ? "Verifica..."
            : isEdit
              ? "Salva modifiche"
              : isRicorrente
                ? "Crea turno ricorrente"
                : "Assegna turno"}
        </button>
        {isEdit && planIds.length > 0 && (
          <button
            type="button"
            disabled={deletingPlan}
            onClick={() => {
              if (
                confirm(
                  "Eliminare anche i turni ricorrenti futuri generati da questo piano? I turni già passati restano in storico, quelli futuri non ancora svolti vengono rimossi."
                )
              ) {
                startDeletingPlan(async () => {
                  await deleteShiftPlans(planIds);
                  onDone?.();
                });
              }
            }}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 disabled:opacity-50"
          >
            {deletingPlan ? "Eliminazione..." : "Elimina anche i turni ricorrenti futuri"}
          </button>
        )}
      </div>

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
