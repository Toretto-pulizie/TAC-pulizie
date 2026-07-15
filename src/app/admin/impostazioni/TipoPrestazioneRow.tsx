"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { updateTipoPrestazione, deleteTipoPrestazione } from "@/app/actions/tipiPrestazione";

export function TipoPrestazioneRow({
  id,
  etichetta,
}: {
  id: string;
  etichetta: string;
}) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(updateTipoPrestazione, undefined);
  const [isDeleting, startDeleteTransition] = useTransition();

  useEffect(() => {
    if (state && "success" in state && state.success) {
      setEditing(false);
    }
  }, [state]);

  if (editing) {
    return (
      <form
        action={action}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 p-3"
      >
        <input type="hidden" name="id" value={id} />
        <label className="flex flex-1 min-w-[16rem] flex-col gap-1 text-sm">
          Testo
          <input
            name="etichetta"
            defaultValue={etichetta}
            required
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Salvataggio..." : "Salva"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700"
        >
          Annulla
        </button>
        {state && "error" in state && (
          <p className="w-full text-sm text-red-600">{state.error}</p>
        )}
      </form>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 p-3">
      <p className="text-sm text-zinc-900">{etichetta}</p>
      <div className="flex shrink-0 gap-3 text-sm">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-zinc-600 underline"
        >
          Modifica
        </button>
        <button
          type="button"
          disabled={isDeleting}
          onClick={() => {
            if (confirm("Eliminare questa voce?")) {
              startDeleteTransition(() => deleteTipoPrestazione(id));
            }
          }}
          className="text-red-600 underline disabled:opacity-50"
        >
          Elimina
        </button>
      </div>
    </div>
  );
}
