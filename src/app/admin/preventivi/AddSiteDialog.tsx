"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createSite } from "@/app/actions/admin";

export function AddSiteDialog({
  clientId,
  clientName,
  onCreated,
}: {
  clientId: string;
  clientName: string;
  onCreated: () => void;
}) {
  const [state, action, pending] = useActionState(createSite, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (state && "success" in state && state.success) {
      formRef.current?.reset();
      dialogRef.current?.close();
      onCreated();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700"
      >
        + Aggiungi sede
      </button>

      {mounted &&
        createPortal(
          // Il <dialog> va renderizzato fuori dal <form> del preventivo: un
          // <form> non può contenerne un altro annidato (il browser lo
          // ignorerebbe/riassocerebbe al form esterno), quindi va portato
          // in document.body.
          <dialog
            ref={dialogRef}
            onClick={(e) => {
              if (e.target === dialogRef.current) dialogRef.current.close();
            }}
            className="w-full max-w-md rounded-xl border border-zinc-200 p-0 backdrop:bg-black/40"
          >
            <form
              ref={formRef}
              action={action}
              className="flex flex-col gap-3 p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-zinc-900">
                  Nuova sede per {clientName}
                </p>
                <button
                  type="button"
                  onClick={() => dialogRef.current?.close()}
                  className="text-sm text-zinc-500"
                >
                  ✕
                </button>
              </div>

              <input type="hidden" name="clientId" value={clientId} />

              <label className="flex flex-col gap-1 text-sm">
                Nome sede/cantiere
                <input
                  name="name"
                  required
                  className="rounded-lg border border-zinc-300 px-3 py-2"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Indirizzo
                <input
                  name="address"
                  required
                  placeholder="Via, numero civico, città"
                  className="rounded-lg border border-zinc-300 px-3 py-2"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Capienza (posti, opzionale)
                <input
                  type="number"
                  min={1}
                  step={1}
                  name="capienza"
                  placeholder="Nessun limite"
                  className="w-32 rounded-lg border border-zinc-300 px-3 py-2"
                />
              </label>

              {state && "error" in state && (
                <p className="text-sm text-red-600">{state.error}</p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => dialogRef.current?.close()}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {pending ? "Creazione..." : "Aggiungi sede"}
                </button>
              </div>
            </form>
          </dialog>,
          document.body
        )}
    </>
  );
}
