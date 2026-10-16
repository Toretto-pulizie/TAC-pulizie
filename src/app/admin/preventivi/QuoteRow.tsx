"use client";

import Link from "next/link";
import { Trunc } from "@/app/Trunc";
import { useState, useTransition } from "react";
import { setQuoteStatus, setQuoteSiteConfermata, deleteQuote } from "@/app/actions/quotes";
import { SendQuoteButton, type InvioInfo } from "./SendQuoteButton";

const statusLabels: Record<string, string> = {
  IN_TRATTATIVA: "In trattativa",
  ACCETTATO: "Accettata",
  RIFIUTATO: "Rifiutata",
};

const statusClasses: Record<string, string> = {
  IN_TRATTATIVA: "bg-amber-100 text-amber-700",
  ACCETTATO: "bg-green-100 text-green-700",
  RIFIUTATO: "bg-zinc-100 text-zinc-500",
};

type PerSite = {
  siteAddress: string;
  tipoServizio: string;
  cadenza: string;
  listPrice: number;
  discountPct: number | null;
  netto: number;
  vendita: number;
  // Passaggi annuali: listino/netto/vendita sono a passaggio, non mensili.
  aPassaggio?: boolean;
  annuo11: number;
  meseRiparam: number;
  id: string;
  confermata: boolean;
};

function formatEuro(n: number) {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

// Importo a passaggio: si aggiunge "/pass." per distinguerlo dal canone mensile.
function formatEuroP(n: number, aPassaggio?: boolean) {
  return formatEuro(n) + (aPassaggio ? " /pass." : "");
}

export function QuoteRow({
  id,
  numeroOfferta,
  clientName,
  tipoServizio,
  siteCount,
  sediConfermate,
  perSite,
  cadenza,
  listPrice,
  netto,
  vendita,
  perPassaggio,
  annuo11,
  meseRiparam,
  discountPct,
  status,
  invio,
}: {
  id: string;
  numeroOfferta: number;
  clientName: string;
  tipoServizio: string | null;
  siteCount: number;
  sediConfermate: number;
  perSite: PerSite[];
  cadenza: string | null;
  listPrice: number;
  netto: number;
  vendita: number;
  // Tutte le sedi a Passaggi annuali: listino/netto/vendita sono a passaggio.
  perPassaggio?: boolean;
  annuo11: number;
  meseRiparam: number;
  discountPct: number | null;
  status: "IN_TRATTATIVA" | "ACCETTATO" | "RIFIUTATO";
  invio: InvioInfo;
}) {
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  // Finestra "Accetta": con più sedi si sceglie quali conferma il cliente.
  const [accettando, setAccettando] = useState(false);
  const [scelte, setScelte] = useState<Record<string, boolean>>({});
  const [errore, setErrore] = useState<string | null>(null);
  // Con più di una sede, gli importi (e spesso la cadenza) cambiano da
  // cantiere a cantiere anche quando il tipo servizio è lo stesso: la riga
  // mostra sempre i totali, il dettaglio per sede si apre a richiesta.
  const canExpand = siteCount > 1;

  return (
    <>
      <tr className="border-b border-zinc-100 last:border-0">
        <td className="px-4 py-3 font-medium text-zinc-900">{numeroOfferta}</td>
        <td className="px-4 py-3">
          <p className="font-medium text-zinc-900">
            <Trunc text={clientName} />
          </p>
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
        <td className="px-4 py-3 text-zinc-500">{tipoServizio ?? "Vario"}</td>
        <td className="px-4 py-3 text-zinc-500">{cadenza ?? "Vario"}</td>
        <td className="px-4 py-3 text-zinc-500">{formatEuroP(listPrice, perPassaggio)}</td>
        <td className="px-4 py-3 text-zinc-500">
          {discountPct != null ? `${(discountPct * 100).toFixed(0)}%` : "—"}
        </td>
        <td className="px-4 py-3 text-zinc-500">{formatEuroP(netto, perPassaggio)}</td>
        <td className="px-4 py-3 text-zinc-500">{formatEuroP(vendita, perPassaggio)}</td>
        <td className="px-4 py-3 text-zinc-500">{formatEuro(annuo11)}</td>
        <td className="px-4 py-3 text-zinc-500">{meseRiparam > 0 ? formatEuro(meseRiparam) : "—"}</td>
        <td className="px-4 py-3">
          <span className={`rounded-full px-2 py-1 text-xs ${statusClasses[status]}`}>
            {status === "ACCETTATO" && sediConfermate < siteCount
              ? `Accettata (${sediConfermate}/${siteCount} sedi)`
              : statusLabels[status]}
          </span>
          {invio.invii.find((i) => i.esito === "INVIATA") && (
            <span
              className="mt-1 block text-[11px] text-zinc-500"
              title={`A ${invio.invii.find((i) => i.esito === "INVIATA")!.destinatari}`}
            >
              ✉ inviata il {invio.invii.find((i) => i.esito === "INVIATA")!.data.slice(0, 5)}
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex justify-end gap-2 text-sm">
            <Link prefetch={false}
              href={`/admin/preventivi/${id}/pdf`}
              target="_blank"
              className="text-zinc-600 underline"
            >
              Stampa
            </Link>
            <SendQuoteButton quoteId={id} numero={numeroOfferta} invio={invio} />
            <Link prefetch={false}
              href={`/admin/preventivi?edit=${id}#quote-form`}
              className="text-zinc-600 underline"
            >
              Modifica
            </Link>
            {status !== "ACCETTATO" && (
              <button
                disabled={isPending}
                onClick={() => {
                  if (siteCount > 1) {
                    setScelte(Object.fromEntries(perSite.map((s) => [s.id, true])));
                    setErrore(null);
                    setAccettando(true);
                    setExpanded(true);
                  } else {
                    startTransition(async () => {
                      await setQuoteStatus(id, "ACCETTATO");
                    });
                  }
                }}
                className="text-green-700 underline disabled:opacity-50"
              >
                Accetta
              </button>
            )}
            {status !== "RIFIUTATO" && (
              <button
                disabled={isPending}
                onClick={() => startTransition(async () => {
                    await setQuoteStatus(id, "RIFIUTATO");
                  })}
                className="text-zinc-500 underline disabled:opacity-50"
              >
                Rifiuta
              </button>
            )}
            {status !== "IN_TRATTATIVA" && (
              <button
                disabled={isPending}
                onClick={() => startTransition(async () => {
                    await setQuoteStatus(id, "IN_TRATTATIVA");
                  })}
                className="text-amber-700 underline disabled:opacity-50"
              >
                Riapri
              </button>
            )}
            <button
              disabled={isPending}
              onClick={() => {
                if (confirm("Eliminare questa offerta?")) {
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
      {accettando && (
        <tr className="border-b border-zinc-100 bg-green-50/60">
          <td colSpan={13} className="px-4 py-3">
            <p className="text-sm font-medium text-zinc-900">
              Offerta {numeroOfferta}: quali sedi conferma il cliente?
            </p>
            <div className="mt-2 flex flex-col gap-1">
              {perSite.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={!!scelte[s.id]}
                    onChange={(e) => setScelte((c) => ({ ...c, [s.id]: e.target.checked }))}
                    className="h-4 w-4"
                  />
                  {s.siteAddress.replace(" — non nel PDF", "")} — {s.tipoServizio} · {formatEuroP(s.vendita, s.aPassaggio)}
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              Le sedi non confermate restano nell&apos;offerta ma non contano nei calcoli e non compaiono nel PDF; si
              possono confermare più avanti.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    const ids = perSite.filter((s) => scelte[s.id]).map((s) => s.id);
                    const res = await setQuoteStatus(id, "ACCETTATO", ids);
                    if (res && "error" in res) setErrore(res.error ?? null);
                    else setAccettando(false);
                  })
                }
                className="rounded-lg bg-green-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                Conferma accettazione
              </button>
              <button
                type="button"
                onClick={() => setAccettando(false)}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700"
              >
                Annulla
              </button>
              {errore && <span className="text-sm text-red-600">{errore}</span>}
            </div>
          </td>
        </tr>
      )}
      {expanded &&
        canExpand &&
        perSite.map((s, i) => (
          <tr key={i} className="border-b border-zinc-100 bg-zinc-50/60 last:border-0">
            <td className="px-4 py-3"></td>
            <td className="px-4 py-3"></td>
            <td className="px-4 py-3 text-zinc-500">{s.siteAddress}</td>
            <td className="px-4 py-3 text-zinc-500">{s.tipoServizio}</td>
            <td className="px-4 py-3 text-zinc-500">{s.cadenza}</td>
            <td className="px-4 py-3 text-zinc-500">{formatEuroP(s.listPrice, s.aPassaggio)}</td>
            <td className="px-4 py-3 text-zinc-500">
              {s.discountPct != null ? `${(s.discountPct * 100).toFixed(0)}%` : "—"}
            </td>
            <td className="px-4 py-3 text-zinc-500">{formatEuroP(s.netto, s.aPassaggio)}</td>
            <td className="px-4 py-3 text-zinc-500">{formatEuroP(s.vendita, s.aPassaggio)}</td>
            <td className="px-4 py-3 text-zinc-500">{formatEuro(s.annuo11)}</td>
            <td className="px-4 py-3 text-zinc-500">{s.meseRiparam > 0 ? formatEuro(s.meseRiparam) : "—"}</td>
            <td className="px-4 py-3"></td>
            <td className="px-4 py-3 text-right">
              {status === "ACCETTATO" && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await setQuoteSiteConfermata(s.id, !s.confermata);
                      if (res && "error" in res) alert(res.error);
                    })
                  }
                  className="text-xs text-zinc-600 underline disabled:opacity-50"
                >
                  {s.confermata ? "Togli conferma" : "Conferma sede"}
                </button>
              )}
            </td>
          </tr>
        ))}
    </>
  );
}
