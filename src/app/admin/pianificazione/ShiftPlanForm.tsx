"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createShiftPlan } from "@/app/actions/shiftPlans";
import { toDateInputValue } from "@/lib/dates";

const WEEKDAYS = [
  { label: "Lun", value: 1 },
  { label: "Mar", value: 2 },
  { label: "Mer", value: 3 },
  { label: "Gio", value: 4 },
  { label: "Ven", value: 5 },
  { label: "Sab", value: 6 },
  { label: "Dom", value: 0 },
];

type QuoteSiteOption = {
  id: string;
  siteId: string;
  label: string;
  serviceType: "ONE_SHOT" | "PASS_SETTIMANALE" | "PASS_MENSILE";
};

export function ShiftPlanForm({
  employees,
  sites,
  quoteSites,
}: {
  employees: { id: string; name: string }[];
  sites: { id: string; label: string }[];
  quoteSites: QuoteSiteOption[];
}) {
  const [state, action, pending] = useActionState(createShiftPlan, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [quoteSiteId, setQuoteSiteId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [intervalWeeks, setIntervalWeeks] = useState(1);

  useEffect(() => {
    if (state && "success" in state && state.success) {
      formRef.current?.reset();
      setQuoteSiteId("");
      setSiteId("");
      setIntervalWeeks(1);
    }
  }, [state]);

  function handleQuoteSiteChange(id: string) {
    setQuoteSiteId(id);
    const qs = quoteSites.find((q) => q.id === id);
    if (qs) {
      setSiteId(qs.siteId);
      setIntervalWeeks(qs.serviceType === "PASS_MENSILE" ? 4 : 1);
    }
  }

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
    >
      {quoteSites.length > 0 && (
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
        <label className="flex flex-col gap-1 text-sm">
          Collaboratore
          <select
            name="userId"
            required
            className="rounded-lg border border-zinc-300 px-3 py-2"
          >
            <option value="">Seleziona...</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Cliente / cantiere
          <select
            name="siteId"
            required
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
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
      </div>

      <div className="flex flex-col gap-1 text-sm">
        Giorni della settimana
        <div className="flex flex-wrap gap-3">
          {WEEKDAYS.map((wd) => (
            <label key={wd.value} className="flex items-center gap-1">
              <input type="checkbox" name="daysOfWeek" value={wd.value} />
              {wd.label}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Ogni quante settimane
          <input
            type="number"
            name="intervalWeeks"
            min={1}
            max={12}
            value={intervalWeeks}
            onChange={(e) => setIntervalWeeks(Number(e.target.value))}
            className="w-24 rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <p className="pb-2 text-xs text-zinc-400">
          Settimanale = 1, mensile ≈ 4
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Dalle
          <input
            type="time"
            name="startTime"
            defaultValue="09:00"
            required
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Alle
          <input
            type="time"
            name="endTime"
            defaultValue="12:00"
            required
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Data inizio
          <input
            type="date"
            name="dataInizio"
            defaultValue={toDateInputValue(new Date())}
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
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Note
        <input
          name="note"
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Salvataggio..." : "Crea turno ricorrente"}
      </button>

      {state && "error" in state && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
    </form>
  );
}
