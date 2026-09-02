"use client";

import { useState } from "react";

export function CollapsibleForm({
  label,
  defaultOpen = false,
  children,
}: {
  label: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-fit rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
      >
        {open ? "✕ Chiudi modulo" : `+ ${label}`}
      </button>
      {open && children}
    </div>
  );
}
