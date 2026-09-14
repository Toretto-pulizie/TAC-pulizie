"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeaderActions } from "../PageHeaderActions";
import { SiteForm } from "./SiteForm";

// I pulsanti azione di questa pagina vivono nel box condiviso in alto
// (vedi PageHeaderActions); "+ Nuova sede/cantiere" resta però un modulo
// che si apre/chiude nel corpo della pagina, quindi lo stato "aperto" va
// condiviso tra il pulsante (in alto) e il modulo (qui sotto).
export function ClientiPageActions({
  clients,
}: {
  clients: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <PageHeaderActions>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          {open ? "✕ Chiudi modulo" : "+ Nuova sede/cantiere"}
        </button>
        <Link
          href="/admin/clienti/nuovo"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          + Nuovo cliente
        </Link>
      </PageHeaderActions>
      {open && <SiteForm clients={clients} />}
    </>
  );
}
