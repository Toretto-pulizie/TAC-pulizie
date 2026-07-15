"use client";

import { useActionState } from "react";
import { updateSite } from "@/app/actions/admin";

export function EditSiteForm({
  id,
  name,
  address,
  capienza,
}: {
  id: string;
  name: string;
  address: string;
  capienza: number | null;
}) {
  const [state, action, pending] = useActionState(updateSite, undefined);

  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
    >
      <input type="hidden" name="id" value={id} />

      <label className="flex flex-col gap-1 text-sm">
        Nome sede/cantiere
        <input
          name="name"
          defaultValue={name}
          required
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Indirizzo
        <input
          name="address"
          defaultValue={address}
          required
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
          defaultValue={capienza ?? ""}
          placeholder="Nessun limite"
          className="w-32 rounded-lg border border-zinc-300 px-3 py-2"
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
          href="/admin/clienti"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-600"
        >
          Annulla
        </a>
      </div>
    </form>
  );
}
