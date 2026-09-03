"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createClient, checkPartitaIva, findCapFromAddress } from "@/app/actions/admin";
import { lookupComuneFromCap } from "@/lib/capLookup";
import { isValidPartitaIva } from "@/lib/partitaIva";
import { Tooltip } from "@/app/Tooltip";

type Tipo = "AZIENDA" | "PERSONA_FISICA";
type PivaStato =
  | { tipo: "verificando" }
  | { tipo: "trovata"; nome: string }
  | { tipo: "non trovata" }
  | { tipo: "non valida" }
  | null;
type CapStato = { tipo: "verificando" } | { tipo: "trovato" } | { tipo: "non trovato" } | null;

export function ClientForm() {
  const [state, action, pending] = useActionState(createClient, undefined);
  const [tipo, setTipo] = useState<Tipo>("AZIENDA");
  const [pivaStato, setPivaStato] = useState<PivaStato>(null);
  const [capStato, setCapStato] = useState<CapStato>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const ragioneSocialeRef = useRef<HTMLInputElement>(null);
  const indirizzoRef = useRef<HTMLInputElement>(null);
  const capRef = useRef<HTMLInputElement>(null);
  const cittaRef = useRef<HTMLInputElement>(null);
  const provinciaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state && "success" in state && state.success) {
      formRef.current?.reset();
      setTipo("AZIENDA");
      setPivaStato(null);
      setCapStato(null);
    }
  }, [state]);

  function applyCap(cap: string) {
    if (capRef.current) capRef.current.value = cap;
    const match = lookupComuneFromCap(cap);
    if (!match) return;
    if (match.comune && cittaRef.current) cittaRef.current.value = match.comune;
    if (match.provincia && provinciaRef.current) {
      provinciaRef.current.value = match.provincia;
    }
  }

  function handleCapBlur(e: React.FocusEvent<HTMLInputElement>) {
    const match = lookupComuneFromCap(e.target.value);
    if (!match) return;
    if (match.comune && cittaRef.current) cittaRef.current.value = match.comune;
    if (match.provincia && provinciaRef.current) {
      provinciaRef.current.value = match.provincia;
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
    if (ragioneSocialeRef.current) ragioneSocialeRef.current.value = ragioneSociale;
    if (indirizzoRef.current) indirizzoRef.current.value = indirizzo;
    if (capRef.current) capRef.current.value = cap;
    if (cittaRef.current) cittaRef.current.value = citta;
    if (provinciaRef.current) provinciaRef.current.value = provincia;
    setPivaStato({ tipo: "trovata", nome: ragioneSociale });
  }

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
    >
      <div className="flex gap-4 text-sm">
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
              className={`w-36 rounded-lg border px-3 py-2 ${
                pivaStato?.tipo === "non valida" || pivaStato?.tipo === "non trovata"
                  ? "border-red-400"
                  : "border-zinc-300"
              }`}
            />
            {pivaStato?.tipo === "verificando" && (
              <span className="text-xs text-zinc-500">Verifica in corso...</span>
            )}
            {pivaStato?.tipo === "trovata" && (
              <span className="text-xs text-green-600">
                ✓ Trovata: {pivaStato.nome}
              </span>
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
              className="w-36 rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
        )}

        {tipo === "AZIENDA" ? (
          <label className="flex flex-col gap-1 text-sm">
            Ragione sociale
            <input
              ref={ragioneSocialeRef}
              name="ragioneSociale"
              required
              className="rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
        ) : (
          <>
            <label className="flex flex-col gap-1 text-sm">
              Nome
              <input
                name="nome"
                required
                className="rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Cognome
              <input
                name="cognome"
                required
                className="rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
          </>
        )}

        <label className="flex flex-col gap-1 text-sm">
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
        <label className="flex flex-col gap-1 text-sm">
          Città
          <input
            ref={cittaRef}
            name="citta"
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Provincia
          <input
            ref={provinciaRef}
            name="provincia"
            maxLength={2}
            className="w-20 rounded-lg border border-zinc-300 px-3 py-2 uppercase"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Persona di riferimento
          <input
            name="personaRiferimento"
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Note
          <input
            name="notes"
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Creazione..." : "Aggiungi cliente"}
        </button>
      </div>

      {state && "error" in state && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
    </form>
  );
}
