export function PrintButton({ invoiceId }: { invoiceId: string }) {
  return (
    <div className="flex gap-3 print:hidden">
      <a
        href={`/admin/fatturazione/${invoiceId}/pdf`}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
      >
        Scarica PDF
      </a>
      <a
        href="/admin/fatturazione"
        className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-600"
      >
        Torna alla fatturazione
      </a>
    </div>
  );
}
