"use client";

import Link from "next/link";
import { useTransition } from "react";
import { deleteFornitore } from "@/app/actions/fornitori";

export function FornitoreRow({
  id,
  codiceFornitore,
  name,
  partitaIva,
  codiceFiscale,
  telefono,
  email,
}: {
  id: string;
  codiceFornitore: number;
  name: string;
  partitaIva: string | null;
  codiceFiscale: string | null;
  telefono: string | null;
  email: string | null;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-zinc-400">
          {String(codiceFornitore).padStart(4, "0")}
        </span>
        <p className="font-medium text-zinc-900">{name}</p>
        {(partitaIva || codiceFiscale) && (
          <span className="text-sm text-zinc-500">
            {partitaIva || codiceFiscale}
          </span>
        )}
        {telefono && <span className="text-sm text-zinc-500">{telefono}</span>}
        {email && <span className="text-sm text-zinc-500">{email}</span>}
        <Link
          href={`/admin/fornitori/${id}`}
          className="ml-auto text-sm text-zinc-600 underline"
        >
          Modifica
        </Link>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            if (confirm("Eliminare questo fornitore?")) {
              startTransition(() => deleteFornitore(id));
            }
          }}
          className="text-sm text-red-600 underline disabled:opacity-50"
        >
          Elimina
        </button>
      </div>
    </div>
  );
}
