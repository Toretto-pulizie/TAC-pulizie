"use client";

import { useActionState } from "react";
import { updateCompanySettings } from "@/app/actions/settings";

type Settings = {
  denominazione: string | null;
  nome: string | null;
  cognome: string | null;
  partitaIva: string;
  codiceFiscale: string;
  indirizzo: string;
  cap: string;
  citta: string;
  provincia: string;
  regimeFiscale: string;
  telefono: string;
  email: string;
  pec: string;
};

export function CompanySettingsForm({ initial }: { initial: Settings }) {
  const [state, action, pending] = useActionState(updateCompanySettings, undefined);

  return (
    <form action={action} className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Dati azienda</h2>
        <p className="text-xs text-zinc-500">
          Dati fiscali dell&apos;azienda emittente, usati nell&apos;header delle
          fatture e nel documento XML inviato allo SDI. Per una ditta
          individuale compila Nome/Cognome (lascia vuota la Denominazione);
          per una società compila solo la Denominazione.
        </p>
      </div>
      <div className="flex max-w-md flex-col gap-3 rounded-lg border border-zinc-200 p-3">
        <label className="flex flex-col gap-1 text-sm">
          Denominazione (società)
          <input
            name="denominazione"
            defaultValue={initial.denominazione ?? ""}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Nome (ditta individuale)
            <input
              name="nome"
              defaultValue={initial.nome ?? ""}
              className="rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Cognome
            <input
              name="cognome"
              defaultValue={initial.cognome ?? ""}
              className="rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Partita IVA
            <input
              name="partitaIva"
              defaultValue={initial.partitaIva}
              className="rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Codice fiscale
            <input
              name="codiceFiscale"
              defaultValue={initial.codiceFiscale}
              className="rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          Indirizzo
          <input
            name="indirizzo"
            defaultValue={initial.indirizzo}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <div className="grid grid-cols-3 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            CAP
            <input
              name="cap"
              defaultValue={initial.cap}
              className="rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Città
            <input
              name="citta"
              defaultValue={initial.citta}
              className="rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Provincia
            <input
              name="provincia"
              defaultValue={initial.provincia}
              maxLength={2}
              className="rounded-lg border border-zinc-300 px-3 py-2 uppercase"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          Regime fiscale (codice FatturaPA)
          <input
            name="regimeFiscale"
            defaultValue={initial.regimeFiscale}
            placeholder="RF01"
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Telefono
            <input
              name="telefono"
              defaultValue={initial.telefono}
              className="rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Email
            <input
              name="email"
              defaultValue={initial.email}
              className="rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          PEC (riceve le ricevute delle fatture elettroniche)
          <input
            name="pec"
            defaultValue={initial.pec}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="w-fit rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Salvataggio..." : "Salva"}
        </button>
        {state && "success" in state && state.success && !pending && (
          <span className="text-sm text-emerald-600">Salvato.</span>
        )}
        {state && "error" in state && (
          <span className="text-sm text-red-600">{state.error}</span>
        )}
      </div>
    </form>
  );
}
