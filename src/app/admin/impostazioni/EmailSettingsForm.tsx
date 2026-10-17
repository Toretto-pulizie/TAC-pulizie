"use client";

import { useActionState } from "react";
import { sendTestEmail, updateEmailSettings } from "@/app/actions/quoteEmail";

type Settings = {
  oggetto: string;
  corpo: string;
  ccnIndirizzo: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpFrom: string;
  passwordImpostata: boolean;
};

export function EmailSettingsForm({
  initial,
  configurata,
  mittente,
  daAmbiente,
}: {
  initial: Settings;
  configurata: boolean;
  // Indirizzo mittente configurato (mai la password).
  mittente: string | null;
  // Vero se i dati arrivano da variabili d'ambiente di Vercel (hanno la precedenza).
  daAmbiente: boolean;
}) {
  const [state, action, pending] = useActionState(updateEmailSettings, undefined);
  const [testState, testAction, testPending] = useActionState(sendTestEmail, undefined);

  return (
    <div className="flex flex-col gap-5">
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
            Posta <strong>configurata</strong>: le offerte partono da <strong>{mittente}</strong>
            {daAmbiente ? " (dati presi dalle variabili di Vercel, che hanno la precedenza)" : ""}.
          </>
        ) : (
          <>
            Posta <strong>non ancora configurata</strong>: compila i dati della casella qui sotto,
            salva e poi invia una email di prova.
          </>
        )}
      </div>

      <form action={action} className="flex flex-col gap-4">
        <div className="flex max-w-xl flex-col gap-3 rounded-lg border border-zinc-200 p-3">
          <p className="text-sm font-medium text-zinc-900">Casella di posta (SMTP)</p>
          <p className="text-xs text-zinc-500">
            Per una casella <strong>Aruba</strong>: server <code>smtps.aruba.it</code>, porta{" "}
            <code>465</code> (SSL), utente = l&apos;indirizzo email completo e la password della
            casella. La password viene salvata cifrata e non è mai più mostrata.
          </p>
          <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
            <label className="flex flex-col gap-1 text-sm">
              Server (SMTP)
              <input
                name="smtpHost"
                defaultValue={initial.smtpHost}
                placeholder="smtps.aruba.it"
                className="rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Porta
              <input
                name="smtpPort"
                type="number"
                defaultValue={initial.smtpPort}
                className="rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            Utente
            <input
              name="smtpUser"
              defaultValue={initial.smtpUser}
              placeholder="info@toret-to.it"
              autoComplete="off"
              className="rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Password
            <input
              name="smtpPass"
              type="password"
              autoComplete="new-password"
              placeholder={
                initial.passwordImpostata
                  ? "•••••••• impostata — lascia vuoto per non cambiarla"
                  : "password della casella"
              }
              className="rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Mittente mostrato (facoltativo)
            <input
              name="smtpFrom"
              defaultValue={initial.smtpFrom}
              placeholder="Toretto - Impresa di pulizie"
              className="rounded-lg border border-zinc-300 px-3 py-2"
            />
            <span className="text-xs text-zinc-500">
              Basta il <strong>nome</strong> che il cliente vede (es. Toretto - Impresa di pulizie):
              l&apos;indirizzo è sempre quello dell&apos;utente SMTP. Se vuoto compare solo
              l&apos;indirizzo. Le risposte dei clienti arrivano all&apos;indirizzo dell&apos;utente.
            </span>
          </label>
        </div>

        <div className="flex max-w-xl flex-col gap-3 rounded-lg border border-zinc-200 p-3">
          <p className="text-sm font-medium text-zinc-900">Testo delle email</p>
          <p className="text-xs text-zinc-500">
            Proposto a ogni invio (si può modificare prima di inviare). Segnaposto:{" "}
            <code>{"{cliente}"}</code>, <code>{"{numero}"}</code> (n. offerta),{" "}
            <code>{"{data}"}</code>.
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

      <form
        action={testAction}
        className="flex max-w-xl flex-col gap-2 rounded-lg border border-zinc-200 p-3"
      >
        <p className="text-sm font-medium text-zinc-900">Email di prova</p>
        <p className="text-xs text-zinc-500">
          Dopo aver salvato, manda un messaggio di prova a una tua casella per controllare che i dati
          siano giusti.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            name="testTo"
            type="email"
            required
            placeholder="la-tua@casella.it"
            className="w-64 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={testPending}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 disabled:opacity-50"
          >
            {testPending ? "Invio..." : "Invia email di prova"}
          </button>
        </div>
        {testState && "success" in testState && testState.success && !testPending && (
          <p className="text-sm text-emerald-700">{"message" in testState ? testState.message : "Inviata."}</p>
        )}
        {testState && "error" in testState && (
          <p className="text-sm text-red-700">{testState.error}</p>
        )}
      </form>
    </div>
  );
}
