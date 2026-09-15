"use client";

import { useState, useTransition } from "react";
import { updateStatisticheSettings } from "@/app/actions/settings";
import { Toggle } from "@/app/Toggle";

export function StatisticheSettingsForm({
  initial,
}: {
  initial: { oreDisponibiliNette: boolean };
}) {
  const [oreDisponibiliNette, setOreDisponibiliNette] = useState(
    initial.oreDisponibiliNette
  );
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function save() {
    startTransition(async () => {
      await updateStatisticheSettings({ oreDisponibiliNette });
      setSaved(true);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Statistiche</h2>
        <p className="text-xs text-zinc-500">
          Come si calcola "Ore disponibili" in Statistiche.
        </p>
      </div>
      <div className="flex max-w-sm flex-col gap-2.5 rounded-lg border border-zinc-200 p-3">
        <Toggle
          checked={oreDisponibiliNette}
          onChange={() => {
            setSaved(false);
            setOreDisponibiliNette((v) => !v);
          }}
          label="Ore disponibili al netto dei permessi"
        />
        <p className="text-xs text-zinc-400">
          {oreDisponibiliNette
            ? "Acceso: sottrae dalle ore disponibili quelle perse per permessi/assenze approvati nel mese (Ferie aziendali comprese)."
            : "Spento: mostra tutte le ore disponibili del mese, senza sottrarre i permessi."}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="w-fit rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? "Salvataggio..." : "Salva"}
        </button>
        {saved && !isPending && (
          <span className="text-sm text-emerald-600">Salvato.</span>
        )}
      </div>
    </div>
  );
}
