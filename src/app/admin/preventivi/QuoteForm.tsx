"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createQuote } from "@/app/actions/quotes";

type ServiceType = "ONE_SHOT" | "PASS_SETTIMANALE" | "PASS_MENSILE";

export function QuoteForm({
  sites,
}: {
  sites: { id: string; label: string }[];
}) {
  const [state, action, pending] = useActionState(createQuote, undefined);
  const [serviceType, setServiceType] = useState<ServiceType>("PASS_SETTIMANALE");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "success" in state && state.success) {
      formRef.current?.reset();
      setServiceType("PASS_SETTIMANALE");
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Cliente / cantiere
          <select
            name="siteId"
            required
            className="rounded-lg border border-zinc-300 px-3 py-2"
          >
            <option value="">Seleziona...</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Tipo di servizio
          <select
            name="serviceType"
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value as ServiceType)}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          >
            <option value="ONE_SHOT">Una tantum</option>
            <option value="PASS_SETTIMANALE">Abbonamento settimanale</option>
            <option value="PASS_MENSILE">Abbonamento mensile</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Ore per intervento
          <input
            type="number"
            step="0.25"
            name="ore"
            required
            className="w-28 rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Spostamento (ore)
          <input
            type="number"
            step="0.25"
            name="spostamento"
            defaultValue={0.5}
            className="w-28 rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>

        {serviceType === "ONE_SHOT" && (
          <label className="flex flex-col gap-1 text-sm">
            N. interventi
            <input
              type="number"
              step="1"
              name="oneShotCount"
              defaultValue={1}
              className="w-28 rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
        )}

        {serviceType === "PASS_SETTIMANALE" && (
          <label className="flex flex-col gap-1 text-sm">
            Interventi/settimana
            <input
              type="number"
              step="0.25"
              name="passSettimanale"
              className="w-28 rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
        )}

        {serviceType === "PASS_MENSILE" && (
          <label className="flex flex-col gap-1 text-sm">
            Interventi/mese
            <input
              type="number"
              step="0.25"
              name="passMensile"
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
                step="0.25"
                name="oreVetri"
                defaultValue={0}
                className="w-28 rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Pass vetri/anno
              <input
                type="number"
                step="1"
                name="passVetriAnno"
                defaultValue={0}
                className="w-28 rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Tariffa vetri €/h
              <input
                type="number"
                step="0.5"
                name="tariffaVetri"
                defaultValue={30}
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
            defaultValue={25}
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
            defaultValue={25}
            required
            className="w-28 rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Prezzo venduto (se noto)
          <input
            type="number"
            step="0.5"
            name="prezzoVenduto"
            className="w-32 rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-1 min-w-[10rem] flex-col gap-1 text-sm">
          Note
          <input
            name="note"
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Salvataggio..." : "Crea preventivo"}
        </button>
      </div>

      {state && "error" in state && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
    </form>
  );
}
