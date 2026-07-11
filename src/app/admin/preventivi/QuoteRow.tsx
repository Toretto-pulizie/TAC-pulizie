"use client";

import Link from "next/link";
import { useTransition } from "react";
import { setQuoteStatus, deleteQuote } from "@/app/actions/quotes";

const statusLabels: Record<string, string> = {
  IN_TRATTATIVA: "In trattativa",
  ACCETTATO: "Accettato",
  RIFIUTATO: "Rifiutato",
};

const statusClasses: Record<string, string> = {
  IN_TRATTATIVA: "bg-amber-100 text-amber-700",
  ACCETTATO: "bg-green-100 text-green-700",
  RIFIUTATO: "bg-zinc-100 text-zinc-500",
};

export function QuoteRow({
  id,
  siteLabel,
  serviceLabel,
  listPrice,
  prezzoVenduto,
  discountPct,
  status,
  note,
}: {
  id: string;
  siteLabel: string;
  serviceLabel: string;
  listPrice: number;
  prezzoVenduto: number | null;
  discountPct: number | null;
  status: "IN_TRATTATIVA" | "ACCETTATO" | "RIFIUTATO";
  note: string | null;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <tr className="border-b border-zinc-100 last:border-0">
      <td className="px-4 py-3">
        <p className="font-medium text-zinc-900">{siteLabel}</p>
        {note && <p className="text-xs text-zinc-400">{note}</p>}
      </td>
      <td className="px-4 py-3 text-zinc-500">{serviceLabel}</td>
      <td className="px-4 py-3 text-zinc-500">
        {listPrice.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
      </td>
      <td className="px-4 py-3 text-zinc-500">
        {prezzoVenduto != null
          ? prezzoVenduto.toLocaleString("it-IT", { style: "currency", currency: "EUR" })
          : "—"}
      </td>
      <td className="px-4 py-3 text-zinc-500">
        {discountPct != null ? `${(discountPct * 100).toFixed(0)}%` : "—"}
      </td>
      <td className="px-4 py-3">
        <span className={`rounded-full px-2 py-1 text-xs ${statusClasses[status]}`}>
          {statusLabels[status]}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-2 text-sm">
          <Link
            href={`/admin/preventivi/${id}/stampa`}
            target="_blank"
            className="text-zinc-600 underline"
          >
            Stampa
          </Link>
          {status !== "ACCETTATO" && (
            <button
              disabled={isPending}
              onClick={() => startTransition(() => setQuoteStatus(id, "ACCETTATO"))}
              className="text-green-700 underline disabled:opacity-50"
            >
              Accetta
            </button>
          )}
          {status !== "RIFIUTATO" && (
            <button
              disabled={isPending}
              onClick={() => startTransition(() => setQuoteStatus(id, "RIFIUTATO"))}
              className="text-zinc-500 underline disabled:opacity-50"
            >
              Rifiuta
            </button>
          )}
          {status !== "IN_TRATTATIVA" && (
            <button
              disabled={isPending}
              onClick={() => startTransition(() => setQuoteStatus(id, "IN_TRATTATIVA"))}
              className="text-amber-700 underline disabled:opacity-50"
            >
              Riapri
            </button>
          )}
          <button
            disabled={isPending}
            onClick={() => startTransition(() => deleteQuote(id))}
            className="text-red-600 underline disabled:opacity-50"
          >
            Elimina
          </button>
        </div>
      </td>
    </tr>
  );
}
