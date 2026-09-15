"use client";

import { useState } from "react";
import { PageHeaderActions } from "../PageHeaderActions";
import { AddLeaveRequestForm } from "./AddLeaveRequestForm";

// Il pulsante vive nel box condiviso in alto (vedi PageHeaderActions); il
// modulo resta però nel corpo della pagina, quindi lo stato "aperto" va
// condiviso tra i due.
export function PermessiPageActions({
  employees,
}: {
  employees: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <PageHeaderActions>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          {open ? "✕ Chiudi modulo" : "+ Aggiungi permesso"}
        </button>
      </PageHeaderActions>
      {open && <AddLeaveRequestForm employees={employees} />}
    </>
  );
}
