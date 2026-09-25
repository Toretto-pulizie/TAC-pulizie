"use client";

import { useActionState, useRef, useState } from "react";
import {
  updateFornitore,
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

export function EditFornitoreForm({
  id,
  name,
  partitaIva,
  codiceFiscale,
  indirizzo,
  cap,
  citta,
  provincia,
  telefono,
  email,
  note,
}: {
  id: string;
  name: string;
  partitaIva: string | null;
  codiceFiscale: string | null;
  indirizzo: string | null;
  cap: string | null;
  citta: string | null;
  provincia: string | null;
  telefono: string | null;
  email: string | null;
  note: string | null;
}) {
  const [state, action, pending] = useActionState(updateFornitore, undefined);
  const [pivaStato, setPivaStato] = useState<PivaStato>(null);
  const [capStato, setCapStato] = useState<CapStato>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const indirizzoRef = useRef<HTMLInputElement>(null);
  const capRef = useRef<HTMLInputElement>(null);
  const cittaRef = useRef<HTMLInputElement>(null);
  const provinciaRef = useRef<HTMLInputElement>(null);

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
    const { ragioneSociale, indirizzo: nuovoIndirizzo, cap: nuovoCap, citta: nuovaCitta, provincia: nuovaProvincia } =
      result.data;
    if (nameRef.current) nameRef.current.value = ragioneSociale.toUpperCase();
    if (indirizzoRef.current) indirizzoRef.current.value = nuovoIndirizzo.toUpperCase();
    if (capRef.current) capRef.current.value = nuovoCap;
    if (cittaRef.current) cittaRef.current.value = nuovaCitta.toUpperCase();
    if (provinciaRef.current) provinciaRef.current.value = nuovaProvincia.toUpperCase();
    setPivaStato({ tipo: "trovata", nome: ragioneSociale });
  }

  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
    >
      <input type="hidden" name="id" value={id} />

      <label className="flex flex-col gap-1 text-sm">
        Nome / Ragione sociale
        <input
          ref={nameRef}
          name="name"
          defaultValue={name}
          required
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>

      <div className="flex flex-wrap gap-3">
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm">
          <Tooltip text="Compila da sola ragione sociale, indirizzo, CAP, città e provincia">
            P. IVA
          </Tooltip>
          <input
            name="partitaIva"
            defaultValue={partitaIva ?? ""}
            onBlur={handlePartitaIvaBlur}
            onChange={() => setPivaStato(null)}
            className={`rounded-lg border px-3 py-2 ${
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
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm">
          Codice fiscale
          <input
            name="codiceFiscale"
            defaultValue={codiceFiscale ?? ""}
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
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm">
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

      <div className="flex flex-wrap gap-3">
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm">
          Telefono
          <input
            name="telefono"
            defaultValue={telefono ?? ""}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm">
          Email
          <input
            name="email"
            type="email"
            defaultValue={email ?? ""}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Note
        <textarea
          name="note"
          defaultValue={note ?? ""}
          rows={3}
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
          href="/admin/fornitori"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-600"
        >
          Annulla
        </a>
      </div>
    </form>
  );
}
