"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deletePhrase } from "@/app/actions/quotePhrases";

export function PhraseRow({
  id,
  codice,
  titolo,
  testo,
}: {
  id: string;
  codice: number;
  titolo: string;
  testo: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="flex flex-col gap-1 rounded-lg border border-zinc-200 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium text-zinc-900">
          <span className="mr-2 font-mono text-xs text-zinc-400">
            #{String(codice).padStart(3, "0")}
          </span>
          {titolo}
        </p>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="text-sm text-zinc-600 underline"
          >
            Contenuto {expanded ? "▴" : "▾"}
          </button>
          <Link
            href={`/admin/preventivi/frasi/${id}`}
            className="text-sm text-zinc-600 underline"
          >
            Modifica
          </Link>
          <button
            disabled={isPending}
            onClick={() => {
              if (confirm("Eliminare questa frase?")) {
                startTransition(() => deletePhrase(id));
              }
            }}
            className="text-sm text-red-600 underline disabled:opacity-50"
          >
            Elimina
          </button>
        </div>
      </div>
      {expanded && (
        <p className="whitespace-pre-wrap text-sm text-zinc-500">{testo}</p>
      )}
    </li>
  );
}
