"use client";

import { useState } from "react";

export function QuoteFormToggle({
  defaultOpen,
  children,
}: {
  defaultOpen: boolean;
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
        {open ? "✕ Chiudi modulo" : "+ Nuovo preventivo"}
      </button>
      {open && <div id="quote-form">{children}</div>}
    </div>
  );
}
