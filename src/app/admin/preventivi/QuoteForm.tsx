"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveQuote } from "@/app/actions/quotes";
import {
  QuoteSiteFieldset,
  type ClientOption,
  type ServiceType,
  type SiteBlockInitial,
  type Phrase,
} from "./QuoteSiteFieldset";

function formatEuro(n: number) {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

export type EditingQuote = {
  id: string;
  clientId: string;
  tipoPrestazione: string;
  condizioniPagamento: string | null;
  sites: SiteBlockInitial[];
};

export function QuoteForm({
  clients,
  phrases,
  serviceLabels,
  tipiPrestazione,
  editingQuote,
}: {
  clients: ClientOption[];
  phrases: Phrase[];
  serviceLabels: Record<ServiceType, string>;
  tipiPrestazione: string[];
  editingQuote?: EditingQuote;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveQuote, undefined);
  const [selectedClientId, setSelectedClientId] = useState(
    editingQuote?.clientId ?? ""
  );
  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const formRef = useRef<HTMLFormElement>(null);

  const nextBlockId = useRef(
    editingQuote ? Math.max(0, editingQuote.sites.length - 1) : 0
  );
  const [blockIds, setBlockIds] = useState<number[]>(() =>
    editingQuote && editingQuote.sites.length > 0
      ? editingQuote.sites.map((_, i) => i)
      : [0]
  );
  const [totali, setTotali] = useState<Record<number, number>>({});
  const totaleComplessivo = Object.values(totali).reduce((a, b) => a + b, 0);

  function addBlock() {
    nextBlockId.current += 1;
    setBlockIds((ids) => [...ids, nextBlockId.current]);
  }

  function removeBlock(id: number) {
    setBlockIds((ids) => ids.filter((x) => x !== id));
    setTotali((t) => {
      const { [id]: _removed, ...rest } = t;
      return rest;
    });
  }

  useEffect(() => {
    if (state && "success" in state && state.success) {
      if (editingQuote) {
        router.push("/admin/preventivi");
      } else {
        formRef.current?.reset();
        setSelectedClientId("");
        nextBlockId.current = 0;
        setBlockIds([0]);
        setTotali({});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
    >
      {editingQuote && (
        <>
          <input type="hidden" name="id" value={editingQuote.id} />
          <p className="text-sm font-medium text-amber-700">
            Stai modificando un preventivo esistente
          </p>
        </>
      )}

      <div className="flex flex-wrap items-start gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Cliente
          <select
            name="clientId"
            required
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          >
            <option value="">Seleziona...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-[16rem] flex-col gap-1 text-sm">
          Tipo di prestazione
          <select
            name="tipoPrestazione"
            required
            defaultValue={editingQuote?.tipoPrestazione ?? ""}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          >
            <option value="">Seleziona...</option>
            {editingQuote?.tipoPrestazione &&
              !tipiPrestazione.includes(editingQuote.tipoPrestazione) && (
                <option value={editingQuote.tipoPrestazione}>
                  {editingQuote.tipoPrestazione}
                </option>
              )}
            {tipiPrestazione.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-3">
        {blockIds.map((id, i) => (
          <QuoteSiteFieldset
            key={id}
            index={id}
            selectedClient={selectedClient}
            initial={editingQuote?.sites[i]}
            canRemove={blockIds.length > 1}
            onRemove={() => removeBlock(id)}
            onTotaleChange={(idx, t) =>
              setTotali((prev) => ({ ...prev, [idx]: t }))
            }
            serviceLabels={serviceLabels}
            phrases={phrases}
          />
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
        <button
          type="button"
          onClick={addBlock}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700"
        >
          + Aggiungi sede al preventivo
        </button>
        {blockIds.length > 1 && (
          <p className="text-sm text-zinc-600">
            Totale complessivo:{" "}
            <span className="font-semibold text-zinc-900">
              {formatEuro(totaleComplessivo)}
            </span>
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3 border-t border-zinc-100 pt-3">
        <label className="flex flex-col gap-1 text-sm">
          Condizioni di pagamento
          <input
            name="condizioniPagamento"
            placeholder="Es. 30 gg data fattura"
            defaultValue={editingQuote?.condizioniPagamento ?? ""}
            className="w-48 rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
      </div>

      <div className="flex justify-end gap-3 border-t border-zinc-100 pt-3">
        {editingQuote && (
          <button
            type="button"
            onClick={() => router.push("/admin/preventivi")}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700"
          >
            Annulla modifica
          </button>
        )}
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending
            ? "Salvataggio..."
            : editingQuote
              ? "Salva modifiche"
              : "Crea preventivo"}
        </button>
      </div>

      {state && "error" in state && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
    </form>
  );
}
