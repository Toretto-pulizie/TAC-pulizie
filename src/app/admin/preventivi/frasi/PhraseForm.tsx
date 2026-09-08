"use client";

import { useActionState, useEffect, useRef } from "react";
import { createPhrase } from "@/app/actions/quotePhrases";

export function PhraseForm() {
  const [state, action, pending] = useActionState(createPhrase, undefined);
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
        Titolo
        <input
          name="titolo"
          required
          placeholder="Es. Pulizia a fondo"
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Testo della frase
        <textarea
          name="testo"
          required
          rows={3}
          placeholder="Testo che verrà inserito nel preventivo"
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
        {pending ? "Salvataggio..." : "Aggiungi frase"}
      </button>
    </form>
  );
}
