"use client";

export function RichiestaFieldset({
  index,
  tipoFisso,
  canRemove,
  onRemove,
}: {
  index: number;
  tipoFisso: string | null;
  canRemove: boolean;
  onRemove: () => void;
}) {
  const name = (field: string) => `richieste.${index}.${field}`;

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-zinc-50/60 p-3">
      <div className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm">
        Tipo di pulizia
        {tipoFisso != null ? (
          <>
            <p className="rounded-lg border border-transparent px-3 py-2 text-zinc-800">
              {tipoFisso}
            </p>
            <input type="hidden" name={name("tipo")} value={tipoFisso} />
          </>
        ) : (
          <input name={name("tipo")} className="rounded-lg border border-zinc-300 px-3 py-2" />
        )}
      </div>
      <label className="flex min-w-[8rem] flex-1 flex-col gap-1 text-sm">
        Frequenza
        <input name={name("frequenza")} className="rounded-lg border border-zinc-300 px-3 py-2" />
      </label>
      <label className="flex min-w-[8rem] flex-1 flex-col gap-1 text-sm">
        Attrezzature
        <input name={name("attrezzature")} className="rounded-lg border border-zinc-300 px-3 py-2" />
      </label>
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="pb-2 text-xs text-red-600 underline"
        >
          ✕ Rimuovi
        </button>
      )}
    </div>
  );
}
