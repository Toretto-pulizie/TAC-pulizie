"use client";

import { useState, useTransition } from "react";
import { updateHomeSettings } from "@/app/actions/settings";
import { Toggle } from "@/app/Toggle";

type Settings = {
  showAlLavoro: boolean;
  showPermessi: boolean;
  showPreventivi: boolean;
  showTurni: boolean;
  showTotalePreventiviAccettati: boolean;
  showTotaleConsuntivi: boolean;
  showAlLavoroBar: boolean;
  showPreventiviBar: boolean;
  showTotaleConsuntiviBar: boolean;
};

export function HomeSettingsForm({ initial }: { initial: Settings }) {
  const [settings, setSettings] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function toggle(key: keyof Settings) {
    setSaved(false);
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function save() {
    startTransition(async () => {
      await updateHomeSettings(settings);
      setSaved(true);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Home</h2>
        <p className="text-xs text-zinc-500">
          Decidi quali sezioni compaiono nella home del programma, per tutti.
        </p>
      </div>
      <div className="flex max-w-sm flex-col gap-2.5 rounded-lg border border-zinc-200 p-3">
        <Toggle
          checked={settings.showAlLavoro}
          onChange={() => toggle("showAlLavoro")}
          label="Al lavoro adesso"
        />
        {settings.showAlLavoro && (
          <div className="ml-4 border-l border-zinc-200 pl-3">
            <Toggle
              checked={settings.showAlLavoroBar}
              onChange={() => toggle("showAlLavoroBar")}
              label="↳ con riepilogo colorato"
            />
          </div>
        )}
        <Toggle
          checked={settings.showPreventivi}
          onChange={() => toggle("showPreventivi")}
          label="Preventivi in trattativa"
        />
        {settings.showPreventivi && (
          <div className="ml-4 border-l border-zinc-200 pl-3">
            <Toggle
              checked={settings.showPreventiviBar}
              onChange={() => toggle("showPreventiviBar")}
              label="↳ con riepilogo colorato"
            />
          </div>
        )}
        <Toggle
          checked={settings.showTurni}
          onChange={() => toggle("showTurni")}
          label="Turni di oggi"
        />
        <Toggle
          checked={settings.showPermessi}
          onChange={() => toggle("showPermessi")}
          label="Permessi in attesa"
        />
        <Toggle
          checked={settings.showTotalePreventiviAccettati}
          onChange={() => toggle("showTotalePreventiviAccettati")}
          label="Totale € preventivi accettati"
        />
        <Toggle
          checked={settings.showTotaleConsuntivi}
          onChange={() => toggle("showTotaleConsuntivi")}
          label="Totale € consuntivi"
        />
        {settings.showTotaleConsuntivi && (
          <div className="ml-4 border-l border-zinc-200 pl-3">
            <Toggle
              checked={settings.showTotaleConsuntiviBar}
              onChange={() => toggle("showTotaleConsuntiviBar")}
              label="↳ con riepilogo (utile/perdita)"
            />
          </div>
        )}
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
