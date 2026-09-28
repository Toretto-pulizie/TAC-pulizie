"use client";

export function AmbienteFieldset({
  index,
  canRemove,
  onRemove,
}: {
  index: number;
  canRemove: boolean;
  onRemove: () => void;
}) {
  const name = (field: string) => `ambienti.${index}.${field}`;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50/60 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
          Ambiente {index + 1}
        </p>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-red-600 underline"
          >
            ✕ Rimuovi
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm">
          Ambiente
          <input name={name("ambiente")} className="rounded-lg border border-zinc-300 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          N°
          <input name={name("numero")} className="w-20 rounded-lg border border-zinc-300 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Mq
          <input name={name("mq")} className="w-24 rounded-lg border border-zinc-300 px-3 py-2" />
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm">
          Tipo pavimento
          <input name={name("pavimento")} className="rounded-lg border border-zinc-300 px-3 py-2" />
        </label>
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm">
          Finestre
          <input name={name("finestre")} className="rounded-lg border border-zinc-300 px-3 py-2" />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Note / osservazioni
        <input name={name("note")} className="rounded-lg border border-zinc-300 px-3 py-2" />
      </label>
    </div>
  );
}
