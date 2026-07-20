"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveQuote } from "@/app/actions/quotes";

type ServiceType = "ONE_SHOT" | "PASS_SETTIMANALE" | "PASS_MENSILE";
type Phrase = {
  id: string;
  codice: number;
  categoria: string;
  titolo: string;
  testo: string;
};
type ClientOption = {
  id: string;
  name: string;
  baseAddress: string | null;
  sites: { id: string; name: string; address: string }[];
};
export type EditingQuote = {
  id: string;
  clientId: string;
  siteId: string;
  serviceType: ServiceType;
  ore: number;
  spostamento: number;
  oneShotCount: number;
  passSettimanale: number | null;
  passMensile: number | null;
  oreVetri: number;
  passVetriAnno: number;
  tariffaOraria: number;
  tariffaVetri: number;
  tariffaConsuntivo: number;
  prezzoVenduto: number | null;
  condizioniPagamento: string | null;
  tipoPrestazione: string;
  note: string | null;
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
  const [serviceType, setServiceType] = useState<ServiceType>(
    editingQuote?.serviceType ?? "PASS_SETTIMANALE"
  );
  const [selectedClientId, setSelectedClientId] = useState(
    editingQuote?.clientId ?? ""
  );
  const [siteSelection, setSiteSelection] = useState(
    editingQuote?.siteId ?? ""
  );
  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const [selectedPhraseIds, setSelectedPhraseIds] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (state && "success" in state && state.success) {
      if (editingQuote) {
        router.push("/admin/preventivi");
      } else {
        formRef.current?.reset();
        setServiceType("PASS_SETTIMANALE");
        setSelectedPhraseIds([]);
        setSelectedClientId("");
        setSiteSelection("");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function togglePhrase(id: string) {
    setSelectedPhraseIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function insertSelectedPhrases() {
    const testi = phrases
      .filter((p) => selectedPhraseIds.includes(p.id))
      .map((p) => p.testo);
    if (testi.length > 0 && noteRef.current) {
      const current = noteRef.current.value.trim();
      noteRef.current.value = [current, ...testi].filter(Boolean).join("\n\n");
    }
    dialogRef.current?.close();
  }

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
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Cliente
            <select
              name="clientId"
              required
              value={selectedClientId}
              onChange={(e) => {
                setSelectedClientId(e.target.value);
                setSiteSelection("");
              }}
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

        {selectedClient && (
          <label className="flex flex-col gap-1 text-sm">
            Sede
            <select
              name="siteSelection"
              required
              value={siteSelection}
              onChange={(e) => setSiteSelection(e.target.value)}
              className="rounded-lg border border-zinc-300 px-3 py-2"
            >
              <option value="">Seleziona...</option>
              {selectedClient.sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.address}
                </option>
              ))}
              {selectedClient.baseAddress && (
                <option value="__base__">
                  Usa indirizzo cliente: {selectedClient.baseAddress}
                </option>
              )}
              <option value="__custom__">Altro (nuovo indirizzo)</option>
            </select>
          </label>
        )}

        {siteSelection === "__custom__" && (
          <label className="flex flex-col gap-1 text-sm">
            Nuovo indirizzo
            <input
              name="nuovoIndirizzo"
              required
              placeholder="Via, numero civico, città"
              className="rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
        )}

        <label className="flex flex-col gap-1 text-sm">
          Tipo di servizio
          <select
            name="serviceType"
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value as ServiceType)}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          >
            <option value="ONE_SHOT">{serviceLabels.ONE_SHOT}</option>
            <option value="PASS_SETTIMANALE">
              {serviceLabels.PASS_SETTIMANALE}
            </option>
            <option value="PASS_MENSILE">{serviceLabels.PASS_MENSILE}</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Ore per intervento
          <input
            type="number"
            step="0.5"
            name="ore"
            required
            defaultValue={editingQuote?.ore}
            className="w-28 rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Spostamento (ore)
          <input
            type="number"
            step="0.5"
            name="spostamento"
            defaultValue={editingQuote?.spostamento ?? 0.5}
            className="w-28 rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>

        {serviceType === "ONE_SHOT" && (
          <label className="flex flex-col gap-1 text-sm">
            N. interventi
            <input
              type="number"
              step="0.5"
              name="oneShotCount"
              defaultValue={editingQuote?.oneShotCount ?? 1}
              className="w-28 rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
        )}

        {serviceType === "PASS_SETTIMANALE" && (
          <label className="flex flex-col gap-1 text-sm">
            Interventi/settimana
            <input
              type="number"
              step="0.5"
              min="0.5"
              name="passSettimanale"
              required
              defaultValue={editingQuote?.passSettimanale ?? undefined}
              className="w-28 rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
        )}

        {serviceType === "PASS_MENSILE" && (
          <label className="flex flex-col gap-1 text-sm">
            Interventi/mese
            <input
              type="number"
              step="0.5"
              min="0.5"
              name="passMensile"
              required
              defaultValue={editingQuote?.passMensile ?? undefined}
              className="w-28 rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3 border-t border-zinc-100 pt-3">
        {serviceType !== "ONE_SHOT" && (
          <>
            <label className="flex flex-col gap-1 text-sm">
              Ore vetri/anno
              <input
                type="number"
                step="0.5"
                name="oreVetri"
                defaultValue={editingQuote?.oreVetri ?? 0}
                className="w-28 rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Pass vetri/anno
              <input
                type="number"
                step="0.5"
                name="passVetriAnno"
                defaultValue={editingQuote?.passVetriAnno ?? 0}
                className="w-28 rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Tariffa vetri €/h
              <input
                type="number"
                step="0.5"
                name="tariffaVetri"
                defaultValue={editingQuote?.tariffaVetri ?? 30}
                className="w-28 rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
          </>
        )}

        <label className="flex flex-col gap-1 text-sm">
          Tariffa oraria €/h
          <input
            type="number"
            step="0.5"
            name="tariffaOraria"
            defaultValue={editingQuote?.tariffaOraria ?? 25}
            required
            className="w-28 rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Tariffa consuntivo €/h
          <input
            type="number"
            step="0.5"
            name="tariffaConsuntivo"
            defaultValue={editingQuote?.tariffaConsuntivo ?? 25}
            required
            className="w-28 rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Sconto % (opzionale)
          <input
            type="number"
            step="0.5"
            min="0"
            max="100"
            name="scontoPct"
            placeholder="Es. 10"
            className="w-28 rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Prezzo venduto (se noto)
          <input
            type="number"
            step="0.5"
            name="prezzoVenduto"
            defaultValue={editingQuote?.prezzoVenduto ?? undefined}
            className="w-32 rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Condizioni di pagamento
          <input
            name="condizioniPagamento"
            placeholder="Es. 30 gg data fattura"
            defaultValue={editingQuote?.condizioniPagamento ?? ""}
            className="w-48 rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-1 min-w-[10rem] flex-col gap-1 text-sm">
          Note
          <textarea
            ref={noteRef}
            name="note"
            rows={3}
            defaultValue={editingQuote?.note ?? ""}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
      </div>

      {phrases.length > 0 && (
        <div className="border-t border-zinc-100 pt-3">
          <button
            type="button"
            onClick={() => dialogRef.current?.showModal()}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700"
          >
            Scegli frasi preimpostate
            {selectedPhraseIds.length > 0 ? ` (${selectedPhraseIds.length})` : ""}
          </button>

          <dialog
            ref={dialogRef}
            onClick={(e) => {
              if (e.target === dialogRef.current) dialogRef.current.close();
            }}
            className="w-full max-w-lg rounded-xl border border-zinc-200 p-0 backdrop:bg-black/40"
          >
            <div className="flex max-h-[80vh] flex-col">
              <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
                <p className="text-sm font-semibold text-zinc-900">
                  Frasi preimpostate
                </p>
                <button
                  type="button"
                  onClick={() => dialogRef.current?.close()}
                  className="text-sm text-zinc-500"
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-col gap-2 overflow-y-auto px-4 py-3">
                {phrases.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-start gap-2 rounded-lg border border-zinc-200 p-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPhraseIds.includes(p.id)}
                      onChange={() => togglePhrase(p.id)}
                      className="mt-1"
                    />
                    <span className="flex items-baseline gap-1.5">
                      <span className="font-mono text-xs text-zinc-400">
                        #{String(p.codice).padStart(3, "0")}
                      </span>
                      <span className="text-xs uppercase tracking-wide text-zinc-400">
                        {p.categoria}
                      </span>
                      <span className="font-medium text-zinc-900">{p.titolo}</span>
                    </span>
                  </label>
                ))}
              </div>

              <div className="flex justify-end gap-3 border-t border-zinc-200 px-4 py-3">
                <button
                  type="button"
                  onClick={() => dialogRef.current?.close()}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={insertSelectedPhrases}
                  disabled={selectedPhraseIds.length === 0}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  Inserisci nelle note
                </button>
              </div>
            </div>
          </dialog>
        </div>
      )}

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
