"use client";

import { useActionState, useEffect, useRef } from "react";
import { createSite } from "@/app/actions/admin";

export function SiteForm({
  clients,
}: {
  clients: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(createSite, undefined);
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
        Cliente
        <select
          name="clientId"
          required
          className="rounded-lg border border-zinc-300 px-3 py-2"
        >
          <option value="">Seleziona...</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Nome sede/cantiere
        <input
          name="name"
          required
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Indirizzo
        <input
          name="address"
          required
          placeholder="Via, numero civico, città"
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Capienza (posti)
        <input
          type="number"
          min={1}
          step={1}
          name="capienza"
          placeholder="Nessun limite"
          className="w-32 rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Creazione..." : "Aggiungi sede"}
      </button>
      {state && "error" in state && (
        <p className="w-full text-sm text-red-600">{state.error}</p>
      )}
    </form>
  );
}
