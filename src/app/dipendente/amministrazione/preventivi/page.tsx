import Link from "next/link";
import { requireModule } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { clientDisplayName } from "@/lib/clients";
import { formatDateLabel } from "@/lib/dates";

const STATUS_LABELS = {
  IN_TRATTATIVA: "In trattativa",
  ACCETTATO: "Accettato",
  RIFIUTATO: "Rifiutato",
} as const;

const STATUS_COLORS = {
  IN_TRATTATIVA: "bg-amber-100 text-amber-700",
  ACCETTATO: "bg-green-100 text-green-700",
  RIFIUTATO: "bg-zinc-100 text-zinc-500",
} as const;

export default async function PreventiviDipendentePage() {
  await requireModule("amministrazione");

  const quotes = await prisma.quote.findMany({
    include: { client: true, sites: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6">
      <header className="flex items-center gap-3">
        <Link href="/dipendente/amministrazione" className="shrink-0 text-sm text-zinc-500">
          ← Indietro
        </Link>
        <h1 className="text-xl font-semibold text-zinc-900">Preventivi</h1>
      </header>

      {quotes.length === 0 && (
        <p className="text-sm text-zinc-400">Nessun preventivo.</p>
      )}

      <ul className="flex flex-col gap-3">
        {quotes.map((q) => (
          <li
            key={q.id}
            className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-zinc-400">
                #{String(q.numeroOfferta).padStart(4, "0")}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[q.status]}`}
              >
                {STATUS_LABELS[q.status]}
              </span>
            </div>
            <p className="font-medium text-zinc-900">{clientDisplayName(q.client)}</p>
            <p className="text-xs text-zinc-500">
              {formatDateLabel(q.createdAt)} · {q.sites.length}{" "}
              {q.sites.length === 1 ? "sede" : "sedi"}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
