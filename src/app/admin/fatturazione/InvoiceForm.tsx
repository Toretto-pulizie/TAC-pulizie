"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { saveInvoice } from "@/app/actions/invoices";
import { SearchSelect } from "@/app/SearchSelect";

type ClientOption = { id: string; name: string; tipo: string };

// Un cantiere (riga di un Preventivo accettato) selezionabile per
// precompilare una riga fattura. Ogni cliente può avere più cantieri, anche
// da preventivi diversi: spuntandone uno solo si fattura quel cantiere a
// parte, spuntandone più d'uno si unificano in un'unica fattura.
type SiteOption = {
  siteId: string;
  clientId: string;
  quoteId: string;
  numeroOfferta: number;
  siteName: string;
  descrizione: string;
  importo: number;
};

// sourceId collega una riga al cantiere che l'ha generata (per poterla
// togliere quando si deseleziona la casella): assente per le righe scritte
// a mano con "+ Aggiungi riga".
type Line = { descrizione: string; quantita: number; prezzoUnitario: number; sourceId?: string };

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

function formatEuro(n: number) {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

// Proposta di regime IVA: stessa regola già usata per i Preventivi
// (src/app/admin/preventivi/[id]/pdf/route.ts) — Persona fisica -> IVA
// normale, tutti gli altri tipi cliente -> reverse charge.
function regimeDefault(tipo: string | undefined): "STANDARD" | "REVERSE_CHARGE" {
  return tipo === "PERSONA_FISICA" ? "STANDARD" : "REVERSE_CHARGE";
}

export function InvoiceForm({
  clients,
  sites,
  defaultData,
  editing,
  isCreditNote = false,
  initialClientId,
}: {
  clients: ClientOption[];
  sites: SiteOption[];
  defaultData: string;
  editing?: EditingInvoice;
  // Cliente già scelto all'apertura (es. dal pulsante "Crea fattura" della
  // sezione "Da fatturare").
  initialClientId?: string;
  // Nota di credito: il cliente è quello della fattura stornata e non si
  // sceglie; le righe si tolgono o riducono a mano (niente cantieri).
  isCreditNote?: boolean;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveInvoice, undefined);

  const startClientId = editing?.clientId ?? initialClientId ?? "";
  const [clientId, setClientId] = useState(startClientId);
  const [regimeIva, setRegimeIva] = useState(
    editing?.regimeIva ?? regimeDefault(clients.find((c) => c.id === startClientId)?.tipo)
  );
  const [righe, setRighe] = useState<Line[]>(editing?.righe.length ? editing.righe : [emptyLine()]);

  const sitesForClient = useMemo(
    () => sites.filter((s) => s.clientId === clientId),
    [sites, clientId]
  );
  const checkedSiteIds = useMemo(
    () => new Set(righe.filter((r) => r.sourceId).map((r) => r.sourceId!)),
    [righe]
  );

  function handleClientChange(id: string) {
    setClientId(id);
    const client = clients.find((c) => c.id === id);
    setRegimeIva(regimeDefault(client?.tipo));
    // Cambiando cliente, le righe generate da cantieri del cliente
    // precedente non hanno più senso: restano solo le righe scritte a mano.
    setRighe((prev) => {
      const manual = prev.filter((r) => !r.sourceId);
      return manual.length > 0 ? manual : [emptyLine()];
    });
  }

  function toggleSite(site: SiteOption, checked: boolean) {
    setRighe((prev) => {
      if (checked) {
        const line: Line = {
          descrizione: site.descrizione,
          quantita: 1,
          prezzoUnitario: site.importo,
          sourceId: site.siteId,
        };
        // Tolgo l'eventuale unica riga vuota iniziale, per non lasciarla a
        // fianco del cantiere appena aggiunto.
        const withoutEmpty = prev.filter((r) => r.sourceId || r.descrizione.trim() || r.prezzoUnitario);
        return [...withoutEmpty, line];
      }
      const next = prev.filter((r) => r.sourceId !== site.siteId);
      return next.length > 0 ? next : [emptyLine()];
    });
  }

  function updateLine(i: number, patch: Partial<Line>) {
    setRighe((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  const totale = righe.reduce((sum, r) => sum + r.quantita * r.prezzoUnitario, 0);

  // Best-effort: se tutte le righe da cantiere vengono dallo stesso
  // preventivo, la fattura resta collegata a quel preventivo; se vengono da
  // preventivi diversi (o è tutta manuale) non c'è un unico preventivo da
  // collegare.
  const sourceQuoteIds = new Set(
    righe.filter((r) => r.sourceId).map((r) => sites.find((s) => s.siteId === r.sourceId)?.quoteId)
  );
  const quoteId = sourceQuoteIds.size === 1 ? [...sourceQuoteIds][0] : undefined;

  useEffect(() => {
    if (state && "success" in state && state.success && state.id) {
      router.push(`/admin/fatturazione/${state.id}`);
    }
  }, [state, router]);

  return (
    <form action={action} className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      {editing && <input type="hidden" name="id" value={editing.id} />}
      {quoteId && <input type="hidden" name="quoteId" value={quoteId} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Cliente
          {isCreditNote && <input type="hidden" name="clientId" value={clientId} />}
          <SearchSelect
            name={isCreditNote ? undefined : "clientId"}
            options={clients.map((c) => ({ value: c.id, label: c.name }))}
            value={clientId}
            onChange={handleClientChange}
            required
            disabled={isCreditNote}
            placeholder="Scrivi il cliente o scegli..."
          />
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

      {clientId && !isCreditNote && (
        <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-50/60 p-3">
          <p className="text-sm font-medium text-zinc-700">
            Cantieri da offerte accettate
          </p>
          <p className="text-xs text-zinc-500">
            Spunta un solo cantiere per fatturarlo a parte, oppure più cantieri per unificarli in questa fattura.
          </p>
          {sitesForClient.length === 0 && (
            <p className="text-sm text-zinc-400">Nessun cantiere con offerta accettata per questo cliente.</p>
          )}
          {sitesForClient.map((s) => (
            <label key={s.siteId} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={checkedSiteIds.has(s.siteId)}
                onChange={(e) => toggleSite(s, e.target.checked)}
                className="h-4 w-4"
              />
              <span className="flex-1">
                {s.siteName}{" "}
                <span className="text-xs text-zinc-400">(Offerta N. {s.numeroOfferta})</span>
              </span>
              <span className="text-zinc-500">{formatEuro(s.importo)}</span>
            </label>
          ))}
        </div>
      )}

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
              onClick={() =>
                setRighe((prev) => {
                  const next = prev.filter((_, idx) => idx !== i);
                  return next.length > 0 ? next : [emptyLine()];
                })
              }
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
          <span className="font-semibold text-zinc-900">{formatEuro(totale)}</span>
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
