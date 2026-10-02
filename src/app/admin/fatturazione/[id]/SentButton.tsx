"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markInvoiceSent, undoMarkInvoiceSent } from "@/app/actions/invoices";

export function SentButton({ id, sent }: { id: string; sent: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    const message = sent
      ? "Riportare questa fattura a \"Emessa\"? Annulla la segnalazione di invio."
      : "Segnare questa fattura come inviata? Usalo se l'hai già spedita con un altro sistema: Toretto non la invia allo SDI.";
    if (!confirm(message)) return;
    setError(null);
    startTransition(async () => {
      const result = sent ? await undoMarkInvoiceSent(id) : await markInvoiceSent(id);
      if (result && "error" in result) {
        setError(result.error ?? "Errore");
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
      >
        {isPending ? "Salvataggio..." : sent ? "Riporta a emessa" : "Segna come inviata"}
      </button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
