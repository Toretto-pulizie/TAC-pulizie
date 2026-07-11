"use client";

import { useActionState, useEffect, useRef } from "react";
import { createLeaveRequest } from "@/app/actions/leaveRequests";
import { TIPO_LABELS } from "@/lib/leaveRequests";

export function LeaveRequestForm() {
  const [state, action, pending] = useActionState(createLeaveRequest, undefined);
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
      className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
    >
      <label className="flex flex-col gap-1 text-sm">
        Tipo
        <select
          name="tipo"
          required
          defaultValue="FERIE_RICHIESTE"
          className="rounded-lg border border-zinc-300 px-3 py-3 text-base"
        >
          {Object.entries(TIPO_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Dal
          <input
            type="date"
            name="dataInizio"
            required
            className="w-full rounded-lg border border-zinc-300 px-3 py-3 text-base"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Al
          <input
            type="date"
            name="dataFine"
            required
            className="w-full rounded-lg border border-zinc-300 px-3 py-3 text-base"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Note (facoltative)
        <input
          name="note"
          className="rounded-lg border border-zinc-300 px-3 py-3 text-base"
        />
      </label>

      {state && "error" in state && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-900 px-4 py-3 text-base font-medium text-white disabled:opacity-50"
      >
        {pending ? "Invio..." : "Invia richiesta"}
      </button>
    </form>
  );
}
