"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeaderActions } from "../PageHeaderActions";
import {
  QuoteForm,
  type EditingQuote,
  type AttachmentOption,
} from "./QuoteForm";
import type { ClientOption, ServiceType, Phrase } from "./QuoteSiteFieldset";

// Il pulsante e il link vivono nel box condiviso in alto (vedi
// PageHeaderActions); il modulo resta però nel corpo della pagina, quindi lo
// stato "aperto" va condiviso tra i due. Il componente va rimontato (via
// `key` nel chiamante) quando cambia il preventivo in modifica, cosi lo
// stato riparte aperto/chiuso come prima con CollapsibleForm.
export function PreventiviPageActions({
  clients,
  phrases,
  serviceLabels,
  tipiPrestazione,
  condizioniPagamento,
  attachments,
  editingQuote,
}: {
  clients: ClientOption[];
  phrases: Phrase[];
  serviceLabels: Record<ServiceType, string>;
  tipiPrestazione: string[];
  condizioniPagamento: string[];
  attachments: AttachmentOption[];
  editingQuote?: EditingQuote;
}) {
  const [open, setOpen] = useState(!!editingQuote);

  return (
    <>
      <PageHeaderActions>
        <Link
          href="/admin/preventivi/frasi"
          className="text-sm text-zinc-600 underline"
        >
          Gestisci frasi preimpostate →
        </Link>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          {open ? "✕ Chiudi modulo" : "+ Nuovo preventivo"}
        </button>
      </PageHeaderActions>
      {open && (
        <QuoteForm
          clients={clients}
          phrases={phrases}
          serviceLabels={serviceLabels}
          tipiPrestazione={tipiPrestazione}
          condizioniPagamento={condizioniPagamento}
          attachments={attachments}
          editingQuote={editingQuote}
        />
      )}
    </>
  );
}
