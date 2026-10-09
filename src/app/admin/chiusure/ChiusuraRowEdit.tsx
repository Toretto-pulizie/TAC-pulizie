"use client";

import { useState, useTransition } from "react";
import { setChiusuraScelta } from "@/app/actions/chiusure";

type Scelta = "DA_DEFINIRE" | "CON_PULIZIE" | "SENZA_PULIZIE";

// Scelta del cliente e nota, modificabili direttamente nella riga del
// riepilogo; salva con un clic (la data della scelta si aggiorna da sola).
export function ChiusuraRowEdit({
  quoteId,
  scelta,
  note,
  sceltaIl,
}: {
  quoteId: string;
  scelta: Scelta;
  note: string;
  sceltaIl: string | null;
}) {
  const [s, setS] = useState<Scelta>(scelta);
  const [n, setN] = useState(note);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const dirty = s !== scelta || n !== note;

  return (
    <div className="flex min-w-[17rem] flex-col gap-1">
      <div className="flex items-center gap-1">
        <select
          value={s}
          onChange={(e) => {
            setS(e.target.value as Scelta);
            setSaved(false);
          }}
          className="rounded-lg border border-zinc-300 px-2 py-1 text-xs"
        >
          <option value="DA_DEFINIRE">Da definire</option>
          <option value="CON_PULIZIE">a) canone invariato + pulizie</option>
          <option value="SENZA_PULIZIE">b) nessun intervento, canone ridotto</option>
        </select>
        <button
          type="button"
          disabled={!dirty || pending}
          onClick={() =>
            start(async () => {
              await setChiusuraScelta(quoteId, s, n);
              setSaved(true);
            })
          }
          className="rounded-lg bg-zinc-900 px-2 py-1 text-xs font-medium text-white disabled:opacity-40"
        >
          {pending ? "..." : "Salva"}
        </button>
      </div>
      <input
        value={n}
        onChange={(e) => {
          setN(e.target.value);
          setSaved(false);
        }}
        placeholder="Nota (es. comunicata a voce il…)"
        className="rounded-lg border border-zinc-300 px-2 py-1 text-xs"
      />
      {(sceltaIl || saved) && (
        <span className="text-[11px] text-zinc-400">
          {saved && !dirty ? "Salvato" : sceltaIl ? `Scelta registrata il ${sceltaIl}` : ""}
        </span>
      )}
    </div>
  );
}
