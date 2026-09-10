"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
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

type PerSite = {
  siteAddress: string;
  cadenza: string;
  listPrice: number;
  discountPct: number | null;
  netto: number;
  vendita: number;
};

function formatEuro(n: number) {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

export function QuoteRow({
  id,
  clientName,
  tipoServizio,
  siteCount,
  perSite,
  cadenza,
  listPrice,
  netto,
  vendita,
  discountPct,
  status,
}: {
  id: string;
  clientName: string;
  tipoServizio: string;
  siteCount: number;
  perSite: PerSite[];
  cadenza: string | null;
  listPrice: number;
  netto: number;
  vendita: number;
  discountPct: number | null;
  status: "IN_TRATTATIVA" | "ACCETTATO" | "RIFIUTATO";
}) {
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  // Con più di una sede, gli importi (e spesso la cadenza) cambiano da
  // cantiere a cantiere anche quando il tipo servizio è lo stesso: la riga
  // mostra sempre i totali, il dettaglio per sede si apre a richiesta.
  const canExpand = siteCount > 1;

  return (
    <>
      <tr className="border-b border-zinc-100 last:border-0">
        <td className="px-4 py-3">
          <p className="font-medium text-zinc-900">{clientName}</p>
        </td>
        <td className="px-4 py-3 text-zinc-500">
          {canExpand ? (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="underline"
            >
              {siteCount} {expanded ? "▴" : "▾"}
            </button>
          ) : (
            siteCount
          )}
        </td>
        <td className="px-4 py-3 text-zinc-500">{tipoServizio}</td>
        <td className="px-4 py-3 text-zinc-500">{cadenza ?? "Vario"}</td>
        <td className="px-4 py-3 text-zinc-500">{formatEuro(listPrice)}</td>
        <td className="px-4 py-3 text-zinc-500">
          {discountPct != null ? `${(discountPct * 100).toFixed(0)}%` : "—"}
        </td>
        <td className="px-4 py-3 text-zinc-500">{formatEuro(netto)}</td>
        <td className="px-4 py-3 text-zinc-500">{formatEuro(vendita)}</td>
        <td className="px-4 py-3">
          <span className={`rounded-full px-2 py-1 text-xs ${statusClasses[status]}`}>
            {statusLabels[status]}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex justify-end gap-2 text-sm">
            <Link
              href={`/admin/preventivi/${id}/pdf`}
              target="_blank"
              className="text-zinc-600 underline"
            >
              Stampa
            </Link>
            <Link
              href={`/admin/preventivi?edit=${id}#quote-form`}
              className="text-zinc-600 underline"
            >
              Modifica
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
              onClick={() => {
                if (confirm("Eliminare questo preventivo?")) {
                  startTransition(() => deleteQuote(id));
                }
              }}
              className="text-red-600 underline disabled:opacity-50"
            >
              Elimina
            </button>
          </div>
        </td>
      </tr>
      {expanded &&
        canExpand &&
        perSite.map((s, i) => (
          <tr key={i} className="border-b border-zinc-100 bg-zinc-50/60 last:border-0">
            <td className="px-4 py-3"></td>
            <td className="px-4 py-3 text-zinc-500">{s.siteAddress}</td>
            <td className="px-4 py-3 text-zinc-500">{tipoServizio}</td>
            <td className="px-4 py-3 text-zinc-500">{s.cadenza}</td>
            <td className="px-4 py-3 text-zinc-500">{formatEuro(s.listPrice)}</td>
            <td className="px-4 py-3 text-zinc-500">
              {s.discountPct != null ? `${(s.discountPct * 100).toFixed(0)}%` : "—"}
            </td>
            <td className="px-4 py-3 text-zinc-500">{formatEuro(s.netto)}</td>
            <td className="px-4 py-3 text-zinc-500">{formatEuro(s.vendita)}</td>
            <td className="px-4 py-3"></td>
            <td className="px-4 py-3"></td>
          </tr>
        ))}
    </>
  );
}
