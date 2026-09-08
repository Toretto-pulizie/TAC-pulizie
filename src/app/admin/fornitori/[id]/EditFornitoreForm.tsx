"use client";

import { useActionState } from "react";
import { updateFornitore } from "@/app/actions/fornitori";

export function EditFornitoreForm({
  id,
  name,
  partitaIva,
  codiceFiscale,
  indirizzo,
  telefono,
  email,
  note,
}: {
  id: string;
  name: string;
  partitaIva: string | null;
  codiceFiscale: string | null;
  indirizzo: string | null;
  telefono: string | null;
  email: string | null;
  note: string | null;
}) {
  const [state, action, pending] = useActionState(updateFornitore, undefined);

  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
    >
      <input type="hidden" name="id" value={id} />

      <label className="flex flex-col gap-1 text-sm">
        Nome / Ragione sociale
        <input
          name="name"
          defaultValue={name}
          required
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>

      <div className="flex flex-wrap gap-3">
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm">
          P. IVA
          <input
            name="partitaIva"
            defaultValue={partitaIva ?? ""}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm">
          Codice fiscale
          <input
            name="codiceFiscale"
            defaultValue={codiceFiscale ?? ""}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Indirizzo
        <input
          name="indirizzo"
          defaultValue={indirizzo ?? ""}
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>

      <div className="flex flex-wrap gap-3">
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm">
          Telefono
          <input
            name="telefono"
            defaultValue={telefono ?? ""}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm">
          Email
          <input
            name="email"
            type="email"
            defaultValue={email ?? ""}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Note
        <textarea
          name="note"
          defaultValue={note ?? ""}
          rows={3}
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
          href="/admin/fornitori"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-600"
        >
          Annulla
        </a>
      </div>
    </form>
  );
}
