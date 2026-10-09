"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { addClosurePeriod, deleteClosurePeriod } from "@/app/actions/chiusure";

type Period = { id: string; nome: string; dal: string; al: string };

export function PeriodiChiusura({ periods, year }: { periods: Period[]; year: number }) {
  const [state, action, pending] = useActionState(addClosurePeriod, undefined);
  const [deleting, startDelete] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "success" in state && state.success) formRef.current?.reset();
  }, [state]);

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Periodi di chiusura aziendale {year}</h2>
        <p className="text-xs text-zinc-400">
          I giorni di chiusura riducono il canone di chi è nella modalità b (nessun intervento) e non contano nelle
          ore disponibili.
        </p>
      </div>

      {periods.length === 0 ? (
        <p className="text-sm text-zinc-400">Nessun periodo di chiusura inserito per il {year}.</p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {periods.map((p) => (
            <li key={p.id} className="flex items-center gap-3">
              <span className="font-medium text-zinc-900">{p.nome}</span>
              <span className="text-zinc-500">
                dal {p.dal} al {p.al}
              </span>
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  if (confirm(`Eliminare il periodo "${p.nome}"?`)) {
                    startDelete(async () => {
                      await deleteClosurePeriod(p.id);
                    });
                  }
                }}
                className="text-xs text-red-600 underline disabled:opacity-50"
              >
                Elimina
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        ref={formRef}
        action={action}
        className="flex flex-wrap items-end gap-3 border-t border-zinc-100 pt-3"
      >
        <label className="flex flex-col gap-1 text-xs text-zinc-600">
          Nome
          <input
            name="nome"
            defaultValue="Chiusura estiva"
            required
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-600">
          Dal
          <input
            type="date"
            name="dal"
            required
            defaultValue={`${year}-08-10`}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-600">
          Al
          <input
            type="date"
            name="al"
            required
            defaultValue={`${year}-08-21`}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Salvataggio..." : "+ Aggiungi periodo"}
        </button>
        {state && "error" in state && <p className="w-full text-sm text-red-600">{state.error}</p>}
      </form>
    </section>
  );
}
