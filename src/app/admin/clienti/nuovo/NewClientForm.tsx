"use client";

import { useActionState, useRef, useState } from "react";
import { createClient, checkPartitaIva, findCapFromAddress } from "@/app/actions/admin";
import { lookupComuneFromCap } from "@/lib/capLookup";
import { isValidPartitaIva } from "@/lib/partitaIva";
import { Tooltip } from "@/app/Tooltip";

type PivaStato =
  | { tipo: "verificando" }
  | { tipo: "trovata"; nome: string }
  | { tipo: "non trovata" }
  | { tipo: "non valida" }
  | null;
type CapStato = { tipo: "verificando" } | { tipo: "trovato" } | { tipo: "non trovato" } | null;

type Tipo = "AZIENDA" | "PERSONA_FISICA" | "ENTE" | "ASSOCIAZIONE";

export function NewClientForm({
  condizioniPagamentoOptions,
}: {
  condizioniPagamentoOptions: string[];
}) {
  const [state, action, pending] = useActionState(createClient, undefined);
  const [tipo, setTipo] = useState<Tipo>("AZIENDA");
  const [pivaStato, setPivaStato] = useState<PivaStato>(null);
  const [capStato, setCapStato] = useState<CapStato>(null);
  const ragioneSocialeRef = useRef<HTMLInputElement>(null);
  const indirizzoRef = useRef<HTMLInputElement>(null);
  const capRef = useRef<HTMLInputElement>(null);
  const cittaRef = useRef<HTMLInputElement>(null);
  const provinciaRef = useRef<HTMLInputElement>(null);

  function applyCap(cap: string) {
    if (capRef.current) capRef.current.value = cap;
    const match = lookupComuneFromCap(cap);
    if (!match) return;
    if (match.comune && cittaRef.current) cittaRef.current.value = match.comune.toUpperCase();
    if (match.provincia && provinciaRef.current) {
      provinciaRef.current.value = match.provincia.toUpperCase();
    }
  }

  function handleCapBlur(e: React.FocusEvent<HTMLInputElement>) {
    const match = lookupComuneFromCap(e.target.value);
    if (!match) return;
    if (match.comune && cittaRef.current) cittaRef.current.value = match.comune.toUpperCase();
    if (match.provincia && provinciaRef.current) {
      provinciaRef.current.value = match.provincia.toUpperCase();
    }
  }

  async function handleIndirizzoBlur(e: React.FocusEvent<HTMLInputElement>) {
    const value = e.target.value.trim();
    if (!value || capRef.current?.value.trim()) return;
    setCapStato({ tipo: "verificando" });
    const result = await findCapFromAddress(value);
    if (!result || "error" in result) {
      setCapStato({ tipo: "non trovato" });
      return;
    }
    applyCap(result.data.cap);
    setCapStato({ tipo: "trovato" });
  }

  async function handlePartitaIvaBlur(e: React.FocusEvent<HTMLInputElement>) {
    const value = e.target.value.trim();
    if (!value) {
      setPivaStato(null);
      return;
    }
    if (!isValidPartitaIva(value)) {
      setPivaStato({ tipo: "non valida" });
      return;
    }
    setPivaStato({ tipo: "verificando" });
    const result = await checkPartitaIva(value);
    if (!result || "error" in result) {
      setPivaStato({ tipo: "non trovata" });
      return;
    }
    const { ragioneSociale, indirizzo, cap, citta, provincia } = result.data;
    if (ragioneSocialeRef.current)
      ragioneSocialeRef.current.value = ragioneSociale.toUpperCase();
    if (indirizzoRef.current) indirizzoRef.current.value = indirizzo.toUpperCase();
    if (capRef.current) capRef.current.value = cap;
    if (cittaRef.current) cittaRef.current.value = citta.toUpperCase();
    if (provinciaRef.current) provinciaRef.current.value = provincia.toUpperCase();
    setPivaStato({ tipo: "trovata", nome: ragioneSociale });
  }

  return (
    <form
      action={action}
      className="flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6"
    >
      {/* --- Dati cliente --- */}
      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
          Dati cliente
        </h2>

        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="tipo"
              value="AZIENDA"
              checked={tipo === "AZIENDA"}
              onChange={() => setTipo("AZIENDA")}
            />
            Azienda
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="tipo"
              value="PERSONA_FISICA"
              checked={tipo === "PERSONA_FISICA"}
              onChange={() => setTipo("PERSONA_FISICA")}
            />
            Persona fisica
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="tipo"
              value="ENTE"
              checked={tipo === "ENTE"}
              onChange={() => setTipo("ENTE")}
            />
            Ente
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="tipo"
              value="ASSOCIAZIONE"
              checked={tipo === "ASSOCIAZIONE"}
              onChange={() => setTipo("ASSOCIAZIONE")}
            />
            Associazione
          </label>
          <label className="ml-4 flex items-center gap-2 border-l border-zinc-200 pl-4">
            <input type="checkbox" name="senzaCodice" value="on" />
            <Tooltip text="Per uso personale/interno (es. un cantiere non fatturabile a un cliente vero): non riceve un codice cliente progressivo e non entra nella numerazione dei clienti reali.">
              Cliente interno (senza codice)
            </Tooltip>
          </label>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          {tipo === "AZIENDA" ? (
            <label className="flex flex-col gap-1 text-sm">
              <Tooltip text="Compila da sola ragione sociale, indirizzo, CAP, città e provincia">
                P. IVA
              </Tooltip>
              <input
                name="partitaIva"
                onBlur={handlePartitaIvaBlur}
                onChange={() => setPivaStato(null)}
                className={`w-48 rounded-lg border px-3 py-2 ${
                  pivaStato?.tipo === "non valida" || pivaStato?.tipo === "non trovata"
                    ? "border-red-400"
                    : "border-zinc-300"
                }`}
              />
              {pivaStato?.tipo === "verificando" && (
                <span className="text-xs text-zinc-500">Verifica in corso...</span>
              )}
              {pivaStato?.tipo === "trovata" && (
                <span className="text-xs text-green-600">✓ Trovata: {pivaStato.nome}</span>
              )}
              {pivaStato?.tipo === "non trovata" && (
                <span className="text-xs text-red-600">
                  ⚠ Non trovata su VIES (verifica il numero)
                </span>
              )}
              {pivaStato?.tipo === "non valida" && (
                <span className="text-xs text-red-600">⚠ Partita IVA non valida</span>
              )}
            </label>
          ) : (
            <label className="flex flex-col gap-1 text-sm">
              Codice fiscale
              <input
                name="codiceFiscale"
                className="w-48 rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
          )}

          {tipo !== "PERSONA_FISICA" ? (
            <label className="flex min-w-[16rem] flex-1 flex-col gap-1 text-sm">
              {tipo === "AZIENDA" ? "Ragione sociale" : "Denominazione"}
              <input
                ref={ragioneSocialeRef}
                name="ragioneSociale"
                required
                className="rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
          ) : (
            <>
              <label className="flex flex-1 flex-col gap-1 text-sm">
                Cognome
                <input
                  name="cognome"
                  required
                  className="rounded-lg border border-zinc-300 px-3 py-2"
                />
              </label>
              <label className="flex flex-1 flex-col gap-1 text-sm">
                Nome
                <input
                  name="nome"
                  required
                  className="rounded-lg border border-zinc-300 px-3 py-2"
                />
              </label>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[16rem] flex-1 flex-col gap-1 text-sm">
            <Tooltip text="Se manca il CAP, prova a compilarlo da solo (in base all'indirizzo)">
              Indirizzo
            </Tooltip>
            <input
              ref={indirizzoRef}
              name="indirizzo"
              onBlur={handleIndirizzoBlur}
              onChange={() => setCapStato(null)}
              className="rounded-lg border border-zinc-300 px-3 py-2"
            />
            {capStato?.tipo === "verificando" && (
              <span className="text-xs text-zinc-500">Cerco il CAP...</span>
            )}
            {capStato?.tipo === "trovato" && (
              <span className="text-xs text-green-600">✓ CAP compilato</span>
            )}
            {capStato?.tipo === "non trovato" && (
              <span className="text-xs text-amber-600">⚠ CAP non trovato, inseriscilo a mano</span>
            )}
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <Tooltip text="Compila da sola città e provincia">CAP</Tooltip>
            <input
              ref={capRef}
              name="cap"
              onBlur={handleCapBlur}
              className="w-24 rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Città
            <input
              ref={cittaRef}
              name="citta"
              className="rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Prov.
            <input
              ref={provinciaRef}
              name="provincia"
              maxLength={2}
              className="w-20 rounded-lg border border-zinc-300 px-3 py-2 uppercase"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Telefono
            <input
              name="telefono"
              className="rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Email
            <input
              name="email"
              type="email"
              className="rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <Tooltip text="Codice Destinatario SDI per la fatturazione elettronica">
              Codice univoco
            </Tooltip>
            <input
              name="codiceUnivoco"
              className="w-40 rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="flex min-w-[16rem] flex-1 flex-col gap-1 text-sm">
            Condizioni di pagamento
            <input
              name="condizioniPagamento"
              list="condizioni-pagamento-options-new"
              placeholder="Es. 30 gg data fattura"
              className="rounded-lg border border-zinc-300 px-3 py-2"
            />
            <datalist id="condizioni-pagamento-options-new">
              {condizioniPagamentoOptions.map((o) => (
                <option key={o} value={o} />
              ))}
            </datalist>
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          Note
          <textarea
            name="notes"
            rows={3}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
      </div>

      {/* --- Persona di riferimento --- */}
      <div className="flex flex-col gap-3 border-t border-zinc-100 pt-4">
        <h2 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
          Persona di riferimento
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-sm">
            Nome
            <input
              name="personaRiferimento"
              className="rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Telefono
            <input
              name="telefonoRiferimento"
              className="rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Email
            <input
              name="emailRiferimento"
              type="email"
              className="rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
        </div>
      </div>

      {state && "error" in state && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Creazione..." : "Crea cliente"}
        </button>
        <a
          href="/admin/clienti"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-600"
        >
          Annulla
        </a>
      </div>
    </form>
  );
}
