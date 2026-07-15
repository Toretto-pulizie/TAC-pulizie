"use client";

import { useActionState } from "react";
import { updateServiceTypeLabel } from "@/app/actions/settings";

export function ServiceTypeLabelRow({
  tipo,
  etichetta,
}: {
  tipo: "ONE_SHOT" | "PASS_SETTIMANALE" | "PASS_MENSILE";
  etichetta: string;
}) {
  const [state, action, pending] = useActionState(updateServiceTypeLabel, undefined);

  return (
    <form
      action={action}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 p-3"
    >
      <input type="hidden" name="tipo" value={tipo} />
      <label className="flex flex-1 min-w-[12rem] flex-col gap-1 text-sm">
        {tipo}
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
      {state && "error" in state && (
        <p className="w-full text-sm text-red-600">{state.error}</p>
      )}
    </form>
  );
}
