"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { saveInvoice } from "@/app/actions/invoices";

type ClientOption = { id: string; name: string; tipo: string };

// Una riga per sede di un Preventivo accettato: usata per precompilare le
// righe fattura scegliendo un Consuntivo invece di scriverle a mano.
type QuoteOption = {
  quoteId: string;
  clientId: string;
  numeroOfferta: number;
  righe: { descrizione: string; importo: number }[];
};

type Line = { descrizione: string; quantita: number; prezzoUnitario: number };

type EditingInvoice = {
  id: string;
  clientId: string;
  quoteId: string | null;
  data: string;
  condizioniPagamento: string | null;
  regimeIva: "STANDARD" | "REVERSE_CHARGE" | "ESENTE";
  note: string | null;
  righe: Line[];
};

const REGIME_LABELS: Record<string, string> = {
  STANDARD: "IVA 22% (privati)",
  REVERSE_CHARGE: "Reverse charge — IVA non addebitata (P.IVA)",
  ESENTE: "Esente IVA",
};

function emptyLine(): Line {
  return { descrizione: "", quantita: 1, prezzoUnitario: 0 };
}

// Proposta di regime IVA: stessa regola già usata per i Preventivi
// (src/app/admin/preventivi/[id]/pdf/route.ts) — Persona fisica -> IVA
// normale, tutti gli altri tipi cliente -> reverse charge.
function regimeDefault(tipo: string | undefined): "STANDARD" | "REVERSE_CHARGE" {
  return tipo === "PERSONA_FISICA" ? "STANDARD" : "REVERSE_CHARGE";
}

export function InvoiceForm({
  clients,
  quotes,
  defaultData,
  editing,
}: {
  clients: ClientOption[];
  quotes: QuoteOption[];
  defaultData: string;
  editing?: EditingInvoice;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveInvoice, undefined);

  const [clientId, setClientId] = useState(editing?.clientId ?? "");
  const [quoteId, setQuoteId] = useState(editing?.quoteId ?? "");
  const [regimeIva, setRegimeIva] = useState(
    editing?.regimeIva ?? regimeDefault(clients.find((c) => c.id === editing?.clientId)?.tipo)
  );
  const [righe, setRighe] = useState<Line[]>(editing?.righe.length ? editing.righe : [emptyLine()]);

  const quotesForClient = useMemo(
    () => quotes.filter((q) => q.clientId === clientId),
    [quotes, clientId]
  );

  function handleClientChange(id: string) {
    setClientId(id);
    setQuoteId("");
    const client = clients.find((c) => c.id === id);
    setRegimeIva(regimeDefault(client?.tipo));
  }

  function handleQuoteChange(id: string) {
    setQuoteId(id);
    const quote = quotesForClient.find((q) => q.quoteId === id);
    if (quote) {
      setRighe(quote.righe.map((r) => ({ descrizione: r.descrizione, quantita: 1, prezzoUnitario: r.importo })));
    }
  }

  function updateLine(i: number, patch: Partial<Line>) {
    setRighe((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  const totale = righe.reduce((sum, r) => sum + r.quantita * r.prezzoUnitario, 0);

  if (state && "success" in state && state.success && state.id) {
    router.push(`/admin/fatturazione/${state.id}`);
  }

  return (
    <form action={action} className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      {editing && <input type="hidden" name="id" value={editing.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Cliente
          <select
            name="clientId"
            value={clientId}
            onChange={(e) => handleClientChange(e.target.value)}
            required
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
        <label className="flex flex-col gap-1 text-sm">
          Genera da Consuntivo/Preventivo (opzionale)
          <select
            name="quoteId"
            value={quoteId}
            onChange={(e) => handleQuoteChange(e.target.value)}
            disabled={!clientId}
            className="rounded-lg border border-zinc-300 px-3 py-2 disabled:bg-zinc-100"
          >
            <option value="">Nessuno (righe libere)</option>
            {quotesForClient.map((q) => (
              <option key={q.quoteId} value={q.quoteId}>
                Offerta N. {q.numeroOfferta}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Data
          <input
            type="date"
            name="data"
            defaultValue={editing?.data ?? defaultData}
            required
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Condizioni di pagamento
          <input
            name="condizioniPagamento"
            defaultValue={editing?.condizioniPagamento ?? ""}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Regime IVA
          <select
            name="regimeIva"
            value={regimeIva}
            onChange={(e) => setRegimeIva(e.target.value as typeof regimeIva)}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          >
            {Object.entries(REGIME_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-zinc-700">Righe</p>
        {righe.map((r, i) => (
          <div key={i} className="flex items-end gap-2">
            <label className="flex flex-1 flex-col gap-1 text-xs">
              Descrizione
              <textarea
                name={`righe.${i}.descrizione`}
                value={r.descrizione}
                onChange={(e) => updateLine(i, { descrizione: e.target.value })}
                required
                rows={3}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex w-20 flex-col gap-1 text-xs">
              Quantità
              <input
                type="number"
                step="0.01"
                name={`righe.${i}.quantita`}
                value={r.quantita}
                onChange={(e) => updateLine(i, { quantita: Number(e.target.value) })}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex w-28 flex-col gap-1 text-xs">
              Prezzo unitario
              <input
                type="number"
                step="0.01"
                name={`righe.${i}.prezzoUnitario`}
                value={r.prezzoUnitario}
                onChange={(e) => updateLine(i, { prezzoUnitario: Number(e.target.value) })}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={() => setRighe((prev) => prev.filter((_, idx) => idx !== i))}
              disabled={righe.length <= 1}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-500 disabled:opacity-30"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setRighe((prev) => [...prev, emptyLine()])}
          className="w-fit rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
        >
          + Aggiungi riga
        </button>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Note
        <textarea
          name="note"
          rows={2}
          defaultValue={editing?.note ?? ""}
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>

      <div className="flex items-center justify-between border-t border-zinc-200 pt-3">
        <p className="text-sm text-zinc-500">
          Totale imponibile:{" "}
          <span className="font-semibold text-zinc-900">
            {totale.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
          </span>
        </p>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? "Salvataggio..." : "Salva bozza"}
          </button>
          {state && "error" in state && (
            <span className="text-sm text-red-600">{state.error}</span>
          )}
        </div>
      </div>
    </form>
  );
}
