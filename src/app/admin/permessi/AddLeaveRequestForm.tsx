"use client";

import { useActionState, useEffect, useRef } from "react";
import { createLeaveRequestAdmin } from "@/app/actions/leaveRequests";
import { TIPO_LABELS } from "@/lib/leaveRequests";

export function AddLeaveRequestForm({
  employees,
}: {
  employees: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(createLeaveRequestAdmin, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "success" in state && state.success) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end"
    >
      <label className="flex flex-col gap-1 text-sm">
        Collaboratore
        <select
          name="userId"
          required
          defaultValue=""
          className="rounded-lg border border-zinc-300 px-3 py-2"
        >
          <option value="" disabled>
            Seleziona...
          </option>
          <option value="ALL">Tutti i collaboratori</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Tipo
        <select
          name="tipo"
          required
          defaultValue="FERIE_AZIENDALI"
          className="rounded-lg border border-zinc-300 px-3 py-2"
        >
          {Object.entries(TIPO_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Dal
        <input
          type="date"
          name="dataInizio"
          required
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Al
        <input
          type="date"
          name="dataFine"
          required
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>
      <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm">
        Note (facoltative)
        <textarea
          name="note"
          rows={1}
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Aggiunta..." : "Aggiungi"}
      </button>
      {state && "error" in state && (
        <p className="w-full text-sm text-red-600">{state.error}</p>
      )}
    </form>
  );
}
