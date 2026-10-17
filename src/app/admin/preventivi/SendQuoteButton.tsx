"use client";

import { useState, useTransition } from "react";
import { sendQuoteEmail } from "@/app/actions/quoteEmail";

export type InvioInfo = {
  // false finché in Impostazioni → Email non sono inseriti i dati della casella.
  configurata: boolean;
  // Indirizzo proposto (email del cliente, o quella di riferimento).
  to: string;
  // Oggetto e messaggio già compilati dal modello di Impostazioni → Email.
  oggetto: string;
  corpo: string;
  // Ultimi invii di questa offerta, dal più recente.
  invii: {
    id: string;
    data: string;
    destinatari: string;
    esito: string;
    errore: string | null;
    da: string | null;
    // Allegati esterni di quell'invio: nomi e dimensioni, vuoto se nessuno.
    allegati: string;
  }[];
};

// Allegati esterni: Vercel accetta circa 4,5 MB per richiesta, quindi 4 MB in totale.
const MAX_TOTALE = 4 * 1024 * 1024;
const MAX_FILE = 8;
// Tipi eseguibili: i provider di posta li rifiuterebbero comunque.
const TIPI_BLOCCATI = /\.(exe|bat|cmd|com|scr|msi|js|jse|vbs|vbe|wsf|ps1|jar|dll|lnk|reg)$/i;
const dimensione = (b: number) =>
  b >= 1024 * 1024
    ? `${(b / 1024 / 1024).toFixed(1).replace(".", ",")} MB`
    : `${Math.max(1, Math.round(b / 1024))} KB`;

export function SendQuoteButton({
  quoteId,
  numero,
  invio,
}: {
  quoteId: string;
  numero: number;
  invio: InvioInfo;
}) {
  const [open, setOpen] = useState(false);
  // Invio senza <form action>: React svuota i campi dopo ogni azione, e in caso
  // di errore si perderebbe quanto scritto (o non si potrebbe riprovare).
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<
    { error?: string; success?: boolean; message?: string } | undefined
  >(undefined);
  const ultimaInviata = invio.invii.find((i) => i.esito === "INVIATA");
  // File esterni scelti dal PC per quest'unico invio (non vengono archiviati).
  const [files, setFiles] = useState<File[]>([]);
  const [erroreFile, setErroreFile] = useState<string | null>(null);
  const totaleFile = files.reduce((s, f) => s + f.size, 0);

  function aggiungiFile(scelti: FileList | null) {
    if (!scelti) return;
    const bloccato = Array.from(scelti).find((f) => TIPI_BLOCCATI.test(f.name));
    if (bloccato) {
      setErroreFile(`Il file "${bloccato.name}" non può essere allegato (tipo non consentito).`);
      return;
    }
    const nuovi = [...files, ...Array.from(scelti)];
    if (nuovi.length > MAX_FILE) {
      setErroreFile(`Puoi aggiungere al massimo ${MAX_FILE} file.`);
      return;
    }
    const tot = nuovi.reduce((s, f) => s + f.size, 0);
    if (tot > MAX_TOTALE) {
      setErroreFile(
        `Con questi file si arriva a ${dimensione(tot)}: il massimo è 4 MB in totale. Riduci o comprimi i file.`
      );
      return;
    }
    setErroreFile(null);
    setFiles(nuovi);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-zinc-600 underline"
        title={
          ultimaInviata
            ? `Ultimo invio: ${ultimaInviata.data} a ${ultimaInviata.destinatari}`
            : "Invia l'offerta via email"
        }
      >
        Invia
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !pending) setOpen(false);
          }}
        >
          <div className="flex max-h-[90vh] w-full max-w-xl flex-col gap-3 overflow-y-auto rounded-xl bg-white p-5 text-left shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-semibold text-zinc-900">
                Invia offerta n. {numero} via email
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="text-sm text-zinc-500 underline disabled:opacity-50"
              >
                Chiudi
              </button>
            </div>

            {!invio.configurata && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                La posta non è ancora configurata: inserisci server, utente e password della casella
                in Impostazioni → Email (solo il titolare). Finché mancano non si può inviare.
              </p>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                fd.delete("files");
                files.forEach((f) => fd.append("files", f));
                setState(undefined);
                startTransition(async () => {
                  const res = await sendQuoteEmail(null, fd);
                  setState(res);
                  // Inviata: i file esterni servivano solo per quell'invio.
                  if (res && "success" in res && res.success) setFiles([]);
                });
              }}
              className="flex flex-col gap-3"
            >
              <input type="hidden" name="quoteId" value={quoteId} />
              <label className="flex flex-col gap-1 text-sm">
                A (più indirizzi separati da virgola)
                <input
                  name="to"
                  defaultValue={invio.to}
                  required
                  placeholder="cliente@esempio.it"
                  className="rounded-lg border border-zinc-300 px-3 py-2"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Copia conoscenza (facoltativo)
                <input
                  name="cc"
                  className="rounded-lg border border-zinc-300 px-3 py-2"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Oggetto
                <input
                  name="subject"
                  defaultValue={invio.oggetto}
                  required
                  className="rounded-lg border border-zinc-300 px-3 py-2"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Messaggio
                <textarea
                  name="body"
                  defaultValue={invio.corpo}
                  required
                  rows={9}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </label>
              <p className="text-xs text-zinc-500">
                Allegato: il PDF dell&apos;offerta (con gli allegati, es. clausole), lo stesso del
                pulsante Stampa.
              </p>

              <div className="flex flex-col gap-1.5 rounded-lg border border-dashed border-zinc-300 p-3">
                <p className="text-sm font-medium text-zinc-800">Altri allegati (dal tuo PC)</p>
                <input
                  type="file"
                  multiple
                  disabled={pending}
                  onChange={(e) => {
                    aggiungiFile(e.target.files);
                    e.target.value = "";
                  }}
                  className="text-sm"
                />
                {files.length > 0 && (
                  <ul className="flex flex-col gap-1 text-xs text-zinc-700">
                    {files.map((f, i) => (
                      <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2">
                        <span className="truncate">
                          {f.name} <span className="text-zinc-400">({dimensione(f.size)})</span>
                        </span>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => setFiles(files.filter((_, j) => j !== i))}
                          className="shrink-0 text-red-600 underline disabled:opacity-50"
                        >
                          togli
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-xs text-zinc-500">
                  Partono solo con questa email, non vengono salvati nel programma. Massimo 4 MB in
                  totale ({dimensione(totaleFile)} usati).
                </p>
                {erroreFile && <p className="text-xs text-red-700">{erroreFile}</p>}
              </div>

              {state?.error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
              )}
              {state?.success && !pending && (
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {state.message}
                </p>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={pending || !invio.configurata}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {pending ? "Invio in corso..." : "Invia"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                  className="text-sm text-zinc-600 underline disabled:opacity-50"
                >
                  Annulla
                </button>
              </div>
            </form>

            {invio.invii.length > 0 && (
              <div className="border-t border-zinc-200 pt-3">
                <p className="mb-1 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                  Invii precedenti
                </p>
                <ul className="flex flex-col gap-1 text-xs text-zinc-600">
                  {invio.invii.map((i) => (
                    <li key={i.id}>
                      {i.data} — a {i.destinatari}
                      {i.da ? ` (da ${i.da})` : ""}
                      {i.allegati ? ` — con altri allegati: ${i.allegati}` : ""} —{" "}
                      {i.esito === "INVIATA" ? (
                        <span className="text-emerald-700">inviata</span>
                      ) : (
                        <span className="text-red-700" title={i.errore ?? undefined}>
                          errore{i.errore ? `: ${i.errore}` : ""}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
