"use client";

import { useActionState } from "react";
import { updatePhrase } from "@/app/actions/quotePhrases";

export function EditPhraseForm({
  id,
  categoria,
  titolo,
  testo,
}: {
  id: string;
  categoria: string;
  titolo: string;
  testo: string;
}) {
  const [state, action, pending] = useActionState(updatePhrase, undefined);

  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
    >
      <input type="hidden" name="id" value={id} />

      <label className="flex flex-col gap-1 text-sm">
        Categoria
        <input
          name="categoria"
          defaultValue={categoria}
          required
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Titolo
        <input
          name="titolo"
          defaultValue={titolo}
          required
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Testo della frase
        <textarea
          name="testo"
          defaultValue={testo}
          required
          rows={4}
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>

      {state && "error" in state && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Salvataggio..." : "Salva modifiche"}
        </button>
        <a
          href="/admin/preventivi/frasi"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-600"
        >
          Annulla
        </a>
      </div>
    </form>
  );
}
