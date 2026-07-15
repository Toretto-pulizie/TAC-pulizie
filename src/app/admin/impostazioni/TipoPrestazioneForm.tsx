"use client";

import { useActionState, useEffect, useRef } from "react";
import { createTipoPrestazione } from "@/app/actions/tipiPrestazione";

export function TipoPrestazioneForm() {
  const [state, action, pending] = useActionState(createTipoPrestazione, undefined);
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
      className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 p-3"
    >
      <label className="flex flex-1 min-w-[16rem] flex-col gap-1 text-sm">
        Nuova voce
        <input
          name="etichetta"
          required
          placeholder="Es. PRESTAZIONE ORDINARIA DI PULIZIA CONDOMINI"
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
