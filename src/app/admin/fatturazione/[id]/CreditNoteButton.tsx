"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCreditNote } from "@/app/actions/invoices";

export function CreditNoteButton({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (
      !confirm(
        "Creare una nota di credito per questa fattura? Verrà creata in bozza con le stesse righe, che potrai ridurre o togliere per stornare solo una parte."
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      const result = await createCreditNote(id);
      if (result && "error" in result) {
        setError(result.error ?? "Errore");
      } else if (result && "id" in result) {
        router.push(`/admin/fatturazione/${result.id}`);
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
        {isPending ? "Creazione..." : "Crea nota di credito"}
      </button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
