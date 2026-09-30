import Link from "next/link";
import { requireModule } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { clientDisplayName } from "@/lib/clients";
import { InvoiceListActions } from "./InvoiceListActions";

function formatEuro(n: number) {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

const STATO_LABELS: Record<string, string> = {
  BOZZA: "Bozza",
  EMESSA: "Emessa",
  INVIATA: "Inviata",
  SCARTATA: "Scartata",
  CONSEGNATA: "Consegnata",
  ACCETTATA: "Accettata",
  RIFIUTATA: "Rifiutata",
  ERRORE_INVIO: "Errore invio",
};

const STATO_COLORS: Record<string, string> = {
  BOZZA: "bg-zinc-100 text-zinc-600",
  EMESSA: "bg-blue-100 text-blue-700",
  INVIATA: "bg-amber-100 text-amber-700",
  SCARTATA: "bg-rose-100 text-rose-700",
  CONSEGNATA: "bg-emerald-100 text-emerald-700",
  ACCETTATA: "bg-emerald-100 text-emerald-700",
  RIFIUTATA: "bg-rose-100 text-rose-700",
  ERRORE_INVIO: "bg-rose-100 text-rose-700",
};

export default async function FatturazionePage() {
  await requireModule("fatturazione");

  const invoices = await prisma.invoice.findMany({
    include: { client: true, righe: true },
    orderBy: [{ data: "desc" }, { createdAt: "desc" }],
  });

  const rows = invoices.map((inv) => ({
    id: inv.id,
    numero: inv.numero != null ? `${inv.numero}/${inv.anno}` : "—",
    clientName: clientDisplayName(inv.client),
    data: inv.data.toLocaleDateString("it-IT"),
    totale: inv.righe.reduce((sum, r) => sum + r.importo, 0),
    stato: inv.stato,
  }));

  const totaleAnnoCorrente = rows
    .filter((r) => r.stato !== "BOZZA")
    .reduce((sum, r) => sum + r.totale, 0);

  return (
    <div className="flex flex-col gap-6 px-4 py-4 sm:px-8 sm:py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Fatturazione</h1>
          <p className="text-sm text-zinc-500">
            Fatture emesse: {formatEuro(totaleAnnoCorrente)} totali (bozze escluse).
          </p>
        </div>
        <Link
          href="/admin/fatturazione/nuova"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          + Nuova fattura
        </Link>
      </div>

      <section className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="border-b border-zinc-300 bg-zinc-100 text-zinc-500">
            <tr>
              {["N.", "Cliente", "Data", "Totale", "Stato", ""].map((h) => (
                <th key={h} className="px-3 py-2 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-zinc-100 last:border-0 hover:bg-blue-50/40">
                <td className="px-3 py-2">
                  <Link href={`/admin/fatturazione/${r.id}`} className="font-medium text-zinc-900 hover:underline">
                    {r.numero}
                  </Link>
                </td>
                <td className="px-3 py-2 text-zinc-700">{r.clientName}</td>
                <td className="px-3 py-2 text-zinc-500">{r.data}</td>
                <td className="px-3 py-2 text-zinc-700">{formatEuro(r.totale)}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATO_COLORS[r.stato]}`}>
                    {STATO_LABELS[r.stato]}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <InvoiceListActions id={r.id} stato={r.stato} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-zinc-400">
                  Nessuna fattura ancora creata.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
