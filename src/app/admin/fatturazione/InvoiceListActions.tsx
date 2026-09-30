"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteInvoice } from "@/app/actions/invoices";

export function InvoiceListActions({ id, stato }: { id: string; stato: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Eliminare questa bozza? L'operazione non è reversibile.")) return;
    startTransition(async () => {
      await deleteInvoice(id);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <a
        href={`/admin/fatturazione/${id}/pdf`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-zinc-500 hover:underline"
      >
        PDF
      </a>
      {stato === "BOZZA" && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="text-zinc-400 hover:text-red-600 disabled:opacity-50"
          title="Elimina bozza"
        >
          ✕
        </button>
      )}
    </div>
  );
}
