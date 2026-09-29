"use client";

import { useState, useTransition } from "react";
import { updateNotificationSettings } from "@/app/actions/settings";
import { Toggle } from "@/app/Toggle";

type Settings = {
  amministrativoPermessi: boolean;
  amministrativoPreventivi: boolean;
  amministrativoSopralluoghi: boolean;
};

export function NotificationSettingsForm({ initial }: { initial: Settings }) {
  const [settings, setSettings] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function toggle(key: keyof Settings) {
    setSaved(false);
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function save() {
    startTransition(async () => {
      await updateNotificationSettings(settings);
      setSaved(true);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Notifiche</h2>
        <p className="text-xs text-zinc-500">
          Oltre al titolare, quali notifiche gestionali arrivano anche ai Collaboratori
          Amministrativi. Gli Operativi non le ricevono mai.
        </p>
      </div>
      <div className="flex max-w-sm flex-col gap-2.5 rounded-lg border border-zinc-200 p-3">
        <Toggle
          checked={settings.amministrativoPermessi}
          onChange={() => toggle("amministrativoPermessi")}
          label="Nuova richiesta di permesso"
        />
        <Toggle
          checked={settings.amministrativoPreventivi}
          onChange={() => toggle("amministrativoPreventivi")}
          label="Preventivo accettato/rifiutato"
        />
        <Toggle
          checked={settings.amministrativoSopralluoghi}
          onChange={() => toggle("amministrativoSopralluoghi")}
          label="Sopralluogo compilato"
        />
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
