"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createShift } from "@/app/actions/shifts";

type Site = { id: string; label: string; capienza: number | null };

export function ShiftForm({
  employees,
  sites,
  occupancy,
  defaultDate,
}: {
  employees: { id: string; name: string }[];
  sites: Site[];
  occupancy: Record<string, Record<string, number>>;
  defaultDate: string;
}) {
  const [state, action, pending] = useActionState(createShift, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [siteId, setSiteId] = useState("");
  const [date, setDate] = useState(defaultDate);

  useEffect(() => {
    if (state && "success" in state && state.success) {
      formRef.current?.reset();
      setSiteId("");
      setDate(defaultDate);
    }
  }, [state, defaultDate]);

  const selectedSite = sites.find((s) => s.id === siteId);
  const currentCount = siteId ? occupancy[siteId]?.[date] ?? 0 : 0;
  const isFull =
    selectedSite?.capienza != null && currentCount >= selectedSite.capienza;

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end"
    >
      <label className="flex flex-col gap-1 text-sm">
        Dipendente
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
          value={siteId}
          onChange={(e) => setSiteId(e.target.value)}
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
        Note
        <input
          name="notes"
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Salvataggio..." : "Assegna turno"}
      </button>
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
    </form>
  );
}
