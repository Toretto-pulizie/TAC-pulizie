"use client";

import { useActionState } from "react";
import { updateBankSettings } from "@/app/actions/settings";

type Settings = {
  nomeBanca: string;
  iban: string;
  intestatario: string;
  swiftBic: string;
};

export function BankSettingsForm({ initial }: { initial: Settings }) {
  const [state, action, pending] = useActionState(updateBankSettings, undefined);

  return (
    <form action={action} className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Banca</h2>
        <p className="text-xs text-zinc-500">
          Dati della banca d&apos;appoggio mostrati nel PDF dei preventivi.
        </p>
      </div>
      <div className="flex max-w-sm flex-col gap-3 rounded-lg border border-zinc-200 p-3">
        <label className="flex flex-col gap-1 text-sm">
          Nome banca
          <input
            name="nomeBanca"
            defaultValue={initial.nomeBanca}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          IBAN
          <input
            name="iban"
            defaultValue={initial.iban}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Intestatario conto
          <input
            name="intestatario"
            defaultValue={initial.intestatario}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          SWIFT/BIC
          <input
            name="swiftBic"
            defaultValue={initial.swiftBic}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="w-fit rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Salvataggio..." : "Salva"}
        </button>
        {state && "success" in state && state.success && !pending && (
          <span className="text-sm text-emerald-600">Salvato.</span>
        )}
        {state && "error" in state && (
          <span className="text-sm text-red-600">{state.error}</span>
        )}
      </div>
    </form>
  );
}
