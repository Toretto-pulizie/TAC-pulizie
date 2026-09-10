"use client";

import { useState, useTransition } from "react";
import { deleteAttachment } from "@/app/actions/attachments";

export function AttachmentRow({
  id,
  nome,
  fileName,
}: {
  id: string;
  nome: string;
  fileName: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <li className="flex flex-col gap-1 rounded-lg border border-zinc-200 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-zinc-900">{nome}</p>
          <p className="text-xs text-zinc-400">{fileName}</p>
        </div>
        <div className="flex shrink-0 gap-3">
          <a
            href={`/admin/allegati/${id}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-zinc-600 underline"
          >
            Anteprima
          </a>
          <button
            disabled={isPending}
            onClick={() => {
              if (confirm(`Eliminare l'allegato "${nome}"?`)) {
                setError(null);
                startTransition(async () => {
                  const result = await deleteAttachment(id);
                  if (result && "error" in result)
                    setError(result.error ?? "Errore durante l'eliminazione");
                });
              }
            }}
            className="text-sm text-red-600 underline disabled:opacity-50"
          >
            Elimina
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </li>
  );
}
