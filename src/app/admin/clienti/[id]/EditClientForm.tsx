"use client";

import { useActionState, useRef, useState } from "react";
import { updateClient, checkPartitaIva, findCapFromAddress } from "@/app/actions/admin";
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

type Tipo = "AZIENDA" | "PERSONA_FISICA";

export function EditClientForm({
  id,
  tipo: initialTipo,
  ragioneSociale,
  nome,
  cognome,
  indirizzo,
  citta,
  cap,
  provincia,
  codiceCliente,
  partitaIva,
  codiceFiscale,
  personaRiferimento,
  notes,
}: {
  id: string;
  tipo: Tipo;
  ragioneSociale: string | null;
  nome: string | null;
  cognome: string | null;
  indirizzo: string | null;
  citta: string | null;
  cap: string | null;
  provincia: string | null;
  codiceCliente: number;
  partitaIva: string | null;
  codiceFiscale: string | null;
  personaRiferimento: string | null;
  notes: string | null;
}) {
  const [state, action, pending] = useActionState(updateClient, undefined);
  const [tipo, setTipo] = useState<Tipo>(initialTipo);
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
      action={action}
      className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
    >
      <input type="hidden" name="id" value={id} />

      <p className="text-sm text-zinc-500">
        Cod. cliente: <span className="font-medium text-zinc-900">{String(codiceCliente).padStart(6, "0")}</span>{" "}
        <span className="text-xs text-zinc-400">(assegnato automaticamente)</span>
      </p>

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

      {tipo === "AZIENDA" ? (
        <label className="flex flex-col gap-1 text-sm">
          <Tooltip text="Compila da sola ragione sociale, indirizzo, CAP, città e provincia">
            P. IVA
          </Tooltip>
          <input
            name="partitaIva"
            defaultValue={partitaIva ?? ""}
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
            defaultValue={codiceFiscale ?? ""}
            className="w-48 rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
      )}

      {tipo === "AZIENDA" ? (
        <label className="flex flex-col gap-1 text-sm">
          Ragione sociale
          <input
            ref={ragioneSocialeRef}
            name="ragioneSociale"
            defaultValue={ragioneSociale ?? ""}
            required
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
      ) : (
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Nome
            <input
              name="nome"
              defaultValue={nome ?? ""}
              required
              className="rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Cognome
            <input
              name="cognome"
              defaultValue={cognome ?? ""}
              required
              className="rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
        </div>
      )}

      <label className="flex flex-col gap-1 text-sm">
        <Tooltip text="Se manca il CAP, prova a compilarlo da solo (in base all'indirizzo)">
          Indirizzo
        </Tooltip>
        <input
          ref={indirizzoRef}
          name="indirizzo"
          defaultValue={indirizzo ?? ""}
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

      <div className="flex gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <Tooltip text="Compila da sola città e provincia">CAP</Tooltip>
          <input
            ref={capRef}
            name="cap"
            defaultValue={cap ?? ""}
            onBlur={handleCapBlur}
            className="w-24 rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Città
          <input
            ref={cittaRef}
            name="citta"
            defaultValue={citta ?? ""}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Prov.
          <input
            ref={provinciaRef}
            name="provincia"
            defaultValue={provincia ?? ""}
            maxLength={2}
            className="w-20 rounded-lg border border-zinc-300 px-3 py-2 uppercase"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Persona di riferimento
        <input
          name="personaRiferimento"
          defaultValue={personaRiferimento ?? ""}
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Note
        <input
          name="notes"
          defaultValue={notes ?? ""}
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>

      {state && "error" in state && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Salvataggio..." : "Salva modifiche"}
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
