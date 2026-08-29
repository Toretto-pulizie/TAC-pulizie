"use client";

import { useState, useTransition } from "react";
import { updateAllowedModules } from "@/app/actions/admin";
import {
  MODULE_GROUPS,
  MODULE_LABELS,
  STANDALONE_MODULE_KEYS,
  type ModuleKey,
} from "@/lib/modules";

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm text-zinc-700">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-emerald-500" : "bg-zinc-200"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

export function PermissionsEditor({
  userId,
  initialAllowed,
}: {
  userId: string;
  initialAllowed: string[];
}) {
  const [allowed, setAllowed] = useState<Set<string>>(new Set(initialAllowed));
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function toggle(key: ModuleKey) {
    setSaved(false);
    setAllowed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function save() {
    startTransition(async () => {
      await updateAllowedModules(userId, Array.from(allowed));
      setSaved(true);
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">
          Pagine accessibili
        </h2>
        <p className="text-xs text-zinc-500">
          Oltre alla propria area personale (timbratura e permessi).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {MODULE_GROUPS.map((group) => (
          <div
            key={group.label}
            className="rounded-lg border border-zinc-200 p-3"
          >
            <p className="mb-2 text-xs font-medium tracking-wide text-zinc-500 uppercase">
              {group.label}
            </p>
            <div className="flex flex-col gap-2.5">
              {group.keys.map((key) => (
                <Toggle
                  key={key}
                  checked={allowed.has(key)}
                  onChange={() => toggle(key)}
                  label={MODULE_LABELS[key]}
                />
              ))}
            </div>
          </div>
        ))}
        <div className="rounded-lg border border-zinc-200 p-3">
          <p className="mb-2 text-xs font-medium tracking-wide text-zinc-500 uppercase">
            Altro
          </p>
          <div className="flex flex-col gap-2.5">
            {STANDALONE_MODULE_KEYS.map((key) => (
              <Toggle
                key={key}
                checked={allowed.has(key)}
                onChange={() => toggle(key)}
                label={MODULE_LABELS[key]}
              />
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-zinc-400">
        &ldquo;Utenti&rdquo; e &ldquo;Impostazioni&rdquo; restano visibili solo al titolare.
      </p>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? "Salvataggio..." : "Salva permessi"}
        </button>
        {saved && !isPending && (
          <span className="text-sm text-emerald-600">Salvato.</span>
        )}
      </div>
    </div>
  );
}
