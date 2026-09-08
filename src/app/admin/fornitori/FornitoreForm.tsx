"use client";

import { useActionState, useEffect, useRef } from "react";
import { createFornitore } from "@/app/actions/fornitori";

export function FornitoreForm() {
  const [state, action, pending] = useActionState(createFornitore, undefined);
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
      <div className="flex flex-wrap gap-3">
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm">
          Nome / Ragione sociale
          <input
            name="name"
            required
            placeholder="Es. Fornitore Srl"
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm">
          P. IVA
          <input
            name="partitaIva"
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm">
          Codice fiscale
          <input
            name="codiceFiscale"
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Indirizzo
        <input
          name="indirizzo"
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>

      <div className="flex flex-wrap gap-3">
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm">
          Telefono
          <input
            name="telefono"
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm">
          Email
          <input
            name="email"
            type="email"
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Note
        <textarea
          name="note"
          rows={2}
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>

      {state && "error" in state && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Salvataggio..." : "Aggiungi fornitore"}
      </button>
    </form>
  );
}
