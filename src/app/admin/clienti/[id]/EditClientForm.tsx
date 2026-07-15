"use client";

import { useActionState, useState } from "react";
import { updateClient } from "@/app/actions/admin";

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
          Ragione sociale
          <input
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
        Indirizzo
        <input
          name="indirizzo"
          defaultValue={indirizzo ?? ""}
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Città
          <input
            name="citta"
            defaultValue={citta ?? ""}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          CAP
          <input
            name="cap"
            defaultValue={cap ?? ""}
            className="w-24 rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Prov.
          <input
            name="provincia"
            defaultValue={provincia ?? ""}
            maxLength={2}
            className="w-20 rounded-lg border border-zinc-300 px-3 py-2 uppercase"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        P. IVA
        <input
          name="partitaIva"
          defaultValue={partitaIva ?? ""}
          className="w-48 rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Codice fiscale
          <input
            name="codiceFiscale"
            defaultValue={codiceFiscale ?? ""}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Persona di riferimento
          <input
            name="personaRiferimento"
            defaultValue={personaRiferimento ?? ""}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
      </div>

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
