"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createClient } from "@/app/actions/admin";

type Tipo = "AZIENDA" | "PERSONA_FISICA";

export function ClientForm() {
  const [state, action, pending] = useActionState(createClient, undefined);
  const [tipo, setTipo] = useState<Tipo>("AZIENDA");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "success" in state && state.success) {
      formRef.current?.reset();
      setTipo("AZIENDA");
    }
  }, [state]);

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
            Ragione sociale
            <input
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
          Indirizzo
          <input
            name="indirizzo"
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Città
          <input
            name="citta"
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          CAP
          <input
            name="cap"
            className="w-24 rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Provincia
          <input
            name="provincia"
            maxLength={2}
            className="w-20 rounded-lg border border-zinc-300 px-3 py-2 uppercase"
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
