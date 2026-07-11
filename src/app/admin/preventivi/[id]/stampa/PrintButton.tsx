"use client";

export function PrintButton() {
  return (
    <div className="flex gap-3 print:hidden">
      <button
        onClick={() => window.print()}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
      >
        Stampa
      </button>
      <a
        href="/admin/preventivi"
        className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-600"
      >
        Torna ai preventivi
      </a>
    </div>
  );
}
