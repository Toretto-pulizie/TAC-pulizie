"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createSopralluogo } from "@/app/actions/sopralluoghi";
import { AmbienteFieldset } from "./AmbienteFieldset";
import { RichiestaFieldset } from "./RichiestaFieldset";

const RICHIESTE_FISSE = [
  "SPOLVERATURA / CESTINI",
  "SCRIVANIE",
  "SERVIZI IGIENICI",
  "SCOPATURA PAVIMENTI",
  "ASPIRAZIONI TAPPETI - MOQUETTES",
  "LAVAGGIO PAVIMENTI",
  "VETRI",
  "DECERATURA / CERATURA",
  "SCALE",
  "ASCENSORI",
  "FORNITURA CARTA IGIENICA – SAPONE MANI – ASCIUGAMANI DI CARTA",
];

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

type RichiestaBlock = { id: number; tipoFisso: string | null };

const RICHIESTE_INIZIALI: RichiestaBlock[] = RICHIESTE_FISSE.map((label, i) => ({
  id: i,
  tipoFisso: label,
}));

export function SopralluogoForm() {
  const [state, action, pending] = useActionState(createSopralluogo, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  const nextAmbienteId = useRef(0);
  const [ambienteIds, setAmbienteIds] = useState<number[]>([0]);

  const nextRichiestaId = useRef(RICHIESTE_FISSE.length - 1);
  const [richieste, setRichieste] = useState<RichiestaBlock[]>(RICHIESTE_INIZIALI);

  function addAmbiente() {
    nextAmbienteId.current += 1;
    setAmbienteIds((ids) => [...ids, nextAmbienteId.current]);
  }

  function removeAmbiente(id: number) {
    setAmbienteIds((ids) => ids.filter((x) => x !== id));
  }

  function addRichiesta() {
    nextRichiestaId.current += 1;
    setRichieste((rs) => [...rs, { id: nextRichiestaId.current, tipoFisso: null }]);
  }

  function removeRichiesta(id: number) {
    setRichieste((rs) => rs.filter((r) => r.id !== id));
  }

  useEffect(() => {
    if (state && "success" in state && state.success) {
      formRef.current?.reset();
      nextAmbienteId.current = 0;
      setAmbienteIds([0]);
      nextRichiestaId.current = RICHIESTE_FISSE.length - 1;
      setRichieste(RICHIESTE_INIZIALI);
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-col gap-6 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold text-zinc-700">Richiesta di offerta</legend>
        <div className="flex flex-wrap gap-4 text-sm">
          {(["VERBALE", "SCRITTA", "TELEFONICA"] as const).map((v) => (
            <label key={v} className="flex items-center gap-1.5">
              <input type="radio" name="richiestaTipo" value={v} />
              {v === "VERBALE" ? "Verbale" : v === "SCRITTA" ? "Scritta" : "Telefonica"}
            </label>
          ))}
        </div>
        <label className="flex w-40 flex-col gap-1 text-sm">
          Del
          <input type="date" name="richiestaData" className="rounded-lg border border-zinc-300 px-3 py-2" />
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-semibold text-zinc-700">Dati del cliente</legend>
        <label className="flex flex-col gap-1 text-sm">
          Nome / Ragione sociale
          <input name="clienteNome" className="rounded-lg border border-zinc-300 px-3 py-2" />
        </label>
        <div className="flex flex-wrap gap-3">
          <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm">
            Indirizzo
            <input name="clienteIndirizzo" className="rounded-lg border border-zinc-300 px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            CAP
            <input name="clienteCap" className="w-24 rounded-lg border border-zinc-300 px-3 py-2" />
          </label>
          <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm">
            Città
            <input name="clienteCitta" className="rounded-lg border border-zinc-300 px-3 py-2" />
          </label>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm">
            Telefono
            <input name="clienteTelefono" className="rounded-lg border border-zinc-300 px-3 py-2" />
          </label>
          <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm">
            Email
            <input name="clienteEmail" type="email" className="rounded-lg border border-zinc-300 px-3 py-2" />
          </label>
          <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm">
            PEC
            <input name="clientePec" type="email" className="rounded-lg border border-zinc-300 px-3 py-2" />
          </label>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm">
            P.IVA
            <input name="clientePartitaIva" className="rounded-lg border border-zinc-300 px-3 py-2" />
          </label>
          <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm">
            Codice univoco per fatturazione
            <input name="clienteCodiceUnivoco" className="rounded-lg border border-zinc-300 px-3 py-2" />
          </label>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-semibold text-zinc-700">Dati del luogo del servizio</legend>
        <div className="flex flex-wrap gap-3">
          <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm">
            Indirizzo
            <input name="luogoIndirizzo" className="rounded-lg border border-zinc-300 px-3 py-2" />
          </label>
          <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm">
            Città
            <input name="luogoCitta" className="rounded-lg border border-zinc-300 px-3 py-2" />
          </label>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm">
            Nome referente
            <input name="referenteNome" className="rounded-lg border border-zinc-300 px-3 py-2" />
          </label>
          <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm">
            Cellulare
            <input name="referenteCellulare" className="rounded-lg border border-zinc-300 px-3 py-2" />
          </label>
          <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm">
            Email
            <input name="referenteEmail" type="email" className="rounded-lg border border-zinc-300 px-3 py-2" />
          </label>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-semibold text-zinc-700">Contenuti ricevuti</legend>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" name="contenutiCapitolati" />
            Capitolati
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" name="contenutiPlanimetrie" />
            Planimetrie
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          Altro
          <input name="contenutiAltro" className="rounded-lg border border-zinc-300 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Note
          <textarea name="note" rows={2} className="rounded-lg border border-zinc-300 px-3 py-2" />
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold text-zinc-700">Tipologia lavoro richiesto</legend>
        <textarea
          name="tipologiaLavoro"
          rows={2}
          placeholder="Es. giornaliera, bisettimanale, trisettimanale..."
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
      </fieldset>

      <fieldset className="flex flex-wrap gap-3">
        <legend className="text-sm font-semibold text-zinc-700">Sopralluogo</legend>
        <label className="flex flex-col gap-1 text-sm">
          Data sopralluogo
          <input
            type="date"
            name="dataSopralluogo"
            defaultValue={todayInputValue()}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-semibold text-zinc-700">Descrizione dei locali</legend>
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Mq complessivi
            <input name="mqComplessivi" className="w-28 rounded-lg border border-zinc-300 px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            N° dipendenti
            <input name="numDipendenti" className="w-28 rounded-lg border border-zinc-300 px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            N° postazioni
            <input name="numPostazioni" className="w-28 rounded-lg border border-zinc-300 px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Numero di ambienti
            <input name="numeroAmbienti" className="w-28 rounded-lg border border-zinc-300 px-3 py-2" />
          </label>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-semibold text-zinc-700">Caratteristiche generali</legend>
        {ambienteIds.map((id) => (
          <AmbienteFieldset
            key={id}
            index={id}
            canRemove={ambienteIds.length > 1}
            onRemove={() => removeAmbiente(id)}
          />
        ))}
        <button
          type="button"
          onClick={addAmbiente}
          className="self-start rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700"
        >
          + Aggiungi ambiente
        </button>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-semibold text-zinc-700">Richieste specifiche del cliente</legend>
        {richieste.map((r) => (
          <RichiestaFieldset
            key={r.id}
            index={r.id}
            tipoFisso={r.tipoFisso}
            canRemove={r.tipoFisso == null}
            onRemove={() => removeRichiesta(r.id)}
          />
        ))}
        <button
          type="button"
          onClick={addRichiesta}
          className="self-start rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700"
        >
          + Aggiungi voce
        </button>
      </fieldset>

      {state && "error" in state && <p className="text-sm text-red-600">{state.error}</p>}
      {state && "success" in state && state.success && (
        <p className="text-sm text-green-600">Sopralluogo salvato.</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Salvataggio..." : "Salva sopralluogo"}
      </button>
    </form>
  );
}
