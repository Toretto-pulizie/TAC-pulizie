"use client";

import { useActionState } from "react";
import { updateEmailSettings } from "@/app/actions/quoteEmail";

type Settings = {
  oggetto: string;
  corpo: string;
  ccnIndirizzo: string;
};

export function EmailSettingsForm({
  initial,
  configurata,
  mittente,
}: {
  initial: Settings;
  configurata: boolean;
  // Indirizzo mittente configurato (mai la password).
  mittente: string | null;
}) {
  const [state, action, pending] = useActionState(updateEmailSettings, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Email</h2>
        <p className="text-xs text-zinc-500">
          Invio delle offerte via email dal pulsante <strong>Invia</strong> nell&apos;elenco Offerte.
        </p>
      </div>

      <div
        className={`max-w-xl rounded-lg border px-3 py-2 text-sm ${
          configurata
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-amber-200 bg-amber-50 text-amber-800"
        }`}
      >
        {configurata ? (
          <>
            Posta <strong>configurata</strong>: le offerte partono da{" "}
            <strong>{mittente}</strong>.
          </>
        ) : (
          <>
            Posta <strong>non ancora configurata</strong>. Su Vercel, in{" "}
            <em>Settings → Environment Variables</em> del progetto, aggiungi (solo per
            Production):
            <ul className="mt-1 list-disc pl-5 text-xs">
              <li>
                <code>SMTP_HOST</code> — server di posta in uscita del tuo provider
              </li>
              <li>
                <code>SMTP_PORT</code> — 587 (oppure 465 con SSL)
              </li>
              <li>
                <code>SMTP_USER</code> — di solito l&apos;indirizzo email completo
              </li>
              <li>
                <code>SMTP_PASS</code> — la password della casella
              </li>
              <li>
                <code>SMTP_FROM</code> — facoltativo, mittente mostrato (es.{" "}
                <code>Toretto &lt;info@toret-to.it&gt;</code>)
              </li>
            </ul>
            Poi fai un nuovo deploy (Deployments → ⋯ → Redeploy). La password resta solo su
            Vercel: non viene salvata nel programma né nel database.
          </>
        )}
      </div>

      <div className="flex max-w-xl flex-col gap-3 rounded-lg border border-zinc-200 p-3">
        <p className="text-xs text-zinc-500">
          Testo proposto a ogni invio (si può modificare prima di inviare). Segnaposto:{" "}
          <code>{"{cliente}"}</code>, <code>{"{numero}"}</code> (n. offerta), <code>{"{data}"}</code>.
        </p>
        <label className="flex flex-col gap-1 text-sm">
          Oggetto
          <input
            name="oggetto"
            defaultValue={initial.oggetto}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Messaggio
          <textarea
            name="corpo"
            defaultValue={initial.corpo}
            rows={10}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Copia nascosta a (facoltativo)
          <input
            name="ccnIndirizzo"
            defaultValue={initial.ccnIndirizzo}
            placeholder="es. info@toret-to.it"
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
          <span className="text-xs text-zinc-500">
            Questa casella riceve una copia di ogni offerta inviata, senza che il cliente la veda.
          </span>
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
        {state && "error" in state && <span className="text-sm text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}
