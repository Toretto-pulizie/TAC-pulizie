"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  createFornitore,
  checkPartitaIvaFornitore,
  findCapFromAddressFornitore,
} from "@/app/actions/fornitori";
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

export function FornitoreForm() {
  const [state, action, pending] = useActionState(createFornitore, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [pivaStato, setPivaStato] = useState<PivaStato>(null);
  const [capStato, setCapStato] = useState<CapStato>(null);
  const [showAgente, setShowAgente] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const indirizzoRef = useRef<HTMLInputElement>(null);
  const capRef = useRef<HTMLInputElement>(null);
  const cittaRef = useRef<HTMLInputElement>(null);
  const provinciaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state && "success" in state && state.success) {
      formRef.current?.reset();
      setPivaStato(null);
      setCapStato(null);
      setShowAgente(false);
    }
  }, [state]);

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
    const result = await findCapFromAddressFornitore(value);
    if (!result || "error" in result) {
      setCapStato({ tipo: "non trovato" });
      return;
    }
    if (capRef.current) capRef.current.value = result.data.cap;
    const match = lookupComuneFromCap(result.data.cap);
    if (match) {
      if (match.comune && cittaRef.current) cittaRef.current.value = match.comune.toUpperCase();
      if (match.provincia && provinciaRef.current) {
        provinciaRef.current.value = match.provincia.toUpperCase();
      }
    }
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
    const result = await checkPartitaIvaFornitore(value);
    if (!result || "error" in result) {
      setPivaStato({ tipo: "non trovata" });
      return;
    }
    const { ragioneSociale, indirizzo, cap, citta, provincia } = result.data;
    if (nameRef.current) nameRef.current.value = ragioneSociale.toUpperCase();
    if (indirizzoRef.current) indirizzoRef.current.value = indirizzo.toUpperCase();
    if (capRef.current) capRef.current.value = cap;
    if (cittaRef.current) cittaRef.current.value = citta.toUpperCase();
    if (provinciaRef.current) provinciaRef.current.value = provincia.toUpperCase();
    setPivaStato({ tipo: "trovata", nome: ragioneSociale });
  }

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
    >
      <div className="flex flex-wrap gap-3">
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
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm">
          Nome / Ragione sociale
          <input
            ref={nameRef}
            name="name"
            required
            placeholder="Es. Fornitore Srl"
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm">
          Codice fiscale
          <input
            name="codiceFiscale"
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm">
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
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm">
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

      <div className="flex flex-wrap gap-3">
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm">
          Telefono
          <input
            name="telefono"
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm">
          Email
          <input
            name="email"
            type="email"
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm">
          PEC
          <input
            name="pec"
            type="email"
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm">
          Codice SDI
          <input
            name="codiceUnivoco"
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
      </div>

      {!showAgente && (
        <button
          type="button"
          onClick={() => setShowAgente(true)}
          className="self-start rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600"
        >
          + Inserisci agente
        </button>
      )}

      {showAgente && (
        <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-700">Agente</span>
            <button
              type="button"
              onClick={() => setShowAgente(false)}
              className="text-xs text-zinc-500"
            >
              ✕ Rimuovi
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm">
              Nome
              <input
                name="agenteNome"
                className="rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm">
              Cognome
              <input
                name="agenteCognome"
                className="rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm">
              Telefono
              <input
                name="agenteTelefono"
                className="rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm">
              Email
              <input
                name="agenteEmail"
                type="email"
                className="rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
          </div>
        </div>
      )}

      <label className="flex flex-col gap-1 text-sm">
        Note
        <textarea
          name="note"
          rows={2}
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>

      {state && "error" in state && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Salvataggio..." : "Aggiungi fornitore"}
      </button>
    </form>
  );
}
