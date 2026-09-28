"use client";

import Link from "next/link";
import { useTransition } from "react";
import { deleteSopralluogo } from "@/app/actions/sopralluoghi";

export function SopralluogoRow({
  id,
  dataLabel,
  clienteNome,
  luogoCitta,
  effettuatoDaName,
}: {
  id: string;
  dataLabel: string;
  clienteNome: string | null;
  luogoCitta: string | null;
  effettuatoDaName: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <tr className="border-b border-zinc-100 last:border-0">
      <td className="px-4 py-2 text-zinc-500">{dataLabel}</td>
      <td className="px-4 py-2 font-medium text-zinc-900">{clienteNome ?? "—"}</td>
      <td className="px-4 py-2 text-zinc-500">{luogoCitta ?? "—"}</td>
      <td className="px-4 py-2 text-zinc-500">{effettuatoDaName}</td>
      <td className="px-4 py-2 text-right whitespace-nowrap">
        <div className="flex justify-end gap-2 text-sm">
          <Link href={`/admin/sopralluoghi/${id}`} className="text-xs text-zinc-500 underline">
            Vedi
          </Link>
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (confirm("Eliminare questo sopralluogo?")) {
                startTransition(() => deleteSopralluogo(id));
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
