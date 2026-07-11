"use client";

import { useState, useTransition } from "react";
import { updateSiteCapienza } from "@/app/actions/admin";

export function SiteCapacityEdit({
  siteId,
  capienza,
}: {
  siteId: string;
  capienza: number | null;
}) {
  const [value, setValue] = useState(capienza?.toString() ?? "");
  const [isPending, startTransition] = useTransition();

  function save() {
    const parsed = value.trim() === "" ? null : parseInt(value, 10);
    startTransition(() => updateSiteCapienza(siteId, parsed));
  }

  return (
    <span className="flex items-center gap-1">
      <input
        type="number"
        min={1}
        step={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="∞"
        className="w-14 rounded border border-zinc-300 px-1 py-0.5 text-xs"
      />
      <button
        disabled={isPending}
        onClick={save}
        className="text-xs text-zinc-500 underline disabled:opacity-50"
      >
        Salva
      </button>
    </span>
  );
}
