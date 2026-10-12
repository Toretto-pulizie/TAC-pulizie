"use client";

import { useState } from "react";
import { PageHeaderActions } from "../PageHeaderActions";
import { SiteForm } from "../clienti/SiteForm";

// Come in Clienti: il pulsante vive nel box condiviso in alto e il modulo si
// apre nel corpo della pagina.
export function SediPageActions({ clients }: { clients: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <PageHeaderActions>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          {open ? "✕ Chiudi modulo" : "+ Nuova sede/cantiere"}
        </button>
      </PageHeaderActions>
      {open && <SiteForm clients={clients} />}
    </>
  );
}
