"use client";

import Link from "next/link";
import { useTransition } from "react";
import { deleteCollaboratore } from "@/app/actions/collaboratori";

export function CollaboratoreRow({
  id,
  codiceCollaboratore,
  nome,
  cognome,
  citta,
  telefono,
  email,
}: {
  id: string;
  codiceCollaboratore: number;
  nome: string;
  cognome: string | null;
  citta: string | null;
  telefono: string | null;
  email: string | null;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <tr className="border-b border-zinc-100 last:border-0">
      <td className="px-3 py-1.5 font-mono text-xs text-zinc-400">
        {String(codiceCollaboratore).padStart(4, "0")}
      </td>
      <td className="px-3 py-1.5 font-medium text-zinc-900">
        {cognome ?? ""} {nome}
      </td>
      <td className="px-3 py-1.5 text-zinc-500">{citta ?? "—"}</td>
      <td className="px-3 py-1.5 text-zinc-500">{telefono ?? "—"}</td>
      <td className="px-3 py-1.5 text-zinc-500">{email ?? "—"}</td>
      <td className="px-3 py-1.5 text-right whitespace-nowrap">
        <div className="flex justify-end gap-2 text-sm">
          <Link
            href={`/admin/collaboratori/${id}`}
            className="text-xs text-zinc-500 underline"
          >
            Modifica
          </Link>
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (confirm("Eliminare questo collaboratore?")) {
                startTransition(() => deleteCollaboratore(id));
              }
            }}
            className="text-xs text-red-600 underline disabled:opacity-50"
          >
            Elimina
          </button>
        </div>
      </td>
    </tr>
  );
}
