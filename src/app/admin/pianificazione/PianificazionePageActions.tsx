"use client";

import { useState } from "react";
import { PageHeaderActions } from "../PageHeaderActions";
import { ShiftPlanForm } from "./ShiftPlanForm";

type QuoteSiteOption = {
  id: string;
  siteId: string;
  label: string;
  serviceType: "ONE_SHOT" | "PASS_SETTIMANALE" | "PASS_MENSILE";
};

// Il pulsante vive nel box condiviso in alto (vedi PageHeaderActions); il
// modulo resta però nel corpo della pagina, quindi lo stato "aperto" va
// condiviso tra i due.
export function PianificazionePageActions({
  employees,
  sites,
  quoteSites,
}: {
  employees: { id: string; name: string }[];
  sites: { id: string; label: string }[];
  quoteSites: QuoteSiteOption[];
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
          {open ? "✕ Chiudi modulo" : "+ Nuovo turno ricorrente"}
        </button>
      </PageHeaderActions>
      {open && (
        <ShiftPlanForm employees={employees} sites={sites} quoteSites={quoteSites} />
      )}
    </>
  );
}
