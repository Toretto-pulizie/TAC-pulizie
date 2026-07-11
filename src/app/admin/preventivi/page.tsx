import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { computeListPrice, computeSoldAnnual, computeDiscountPct } from "@/lib/quotes";
import { AdminNav } from "../AdminNav";
import { QuoteForm } from "./QuoteForm";
import { QuoteRow } from "./QuoteRow";

const serviceLabels: Record<string, string> = {
  ONE_SHOT: "Una tantum",
  PASS_SETTIMANALE: "Abbonamento settimanale",
  PASS_MENSILE: "Abbonamento mensile",
};

function formatEuro(n: number) {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

export default async function PreventiviPage() {
  await requireAdmin();

  const [sites, quotes] = await Promise.all([
    prisma.site.findMany({
      include: { client: true },
      orderBy: [{ client: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.quote.findMany({
      include: { site: { include: { client: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const rows = quotes.map((q) => {
    const listPrice = computeListPrice(q);
    const discountPct =
      q.prezzoVenduto != null ? computeDiscountPct(listPrice, q.prezzoVenduto) : null;
    const annuo =
      q.status === "ACCETTATO" && q.prezzoVenduto != null
        ? computeSoldAnnual(q.serviceType, q.prezzoVenduto)
        : 0;
    return { ...q, listPrice, discountPct, annuo };
  });

  const inTrattativaValore = rows
    .filter((r) => r.status === "IN_TRATTATIVA")
    .reduce((sum, r) => sum + r.listPrice, 0);
  const mensileAccettato = rows
    .filter((r) => r.status === "ACCETTATO")
    .reduce((sum, r) => sum + (r.prezzoVenduto ?? 0), 0);
  const annuoAccettato = rows.reduce((sum, r) => sum + r.annuo, 0);

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="preventivi" />
      <div className="flex flex-col gap-6 p-4 sm:p-8">
        <QuoteForm
          sites={sites.map((s) => ({
            id: s.id,
            label: `${s.client.name} — ${s.name}`,
          }))}
        />

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Preventivi in trattativa</p>
            <p className="text-xl font-semibold text-zinc-900">
              {formatEuro(inTrattativaValore)}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Contratti accettati / mese</p>
            <p className="text-xl font-semibold text-zinc-900">
              {formatEuro(mensileAccettato)}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Valore annuo contratti</p>
            <p className="text-xl font-semibold text-zinc-900">
              {formatEuro(annuoAccettato)}
            </p>
          </div>
        </section>

        <section className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Cliente / cantiere</th>
                <th className="px-4 py-3 font-medium">Servizio</th>
                <th className="px-4 py-3 font-medium">Prezzo listino</th>
                <th className="px-4 py-3 font-medium">Prezzo venduto</th>
                <th className="px-4 py-3 font-medium">Sconto</th>
                <th className="px-4 py-3 font-medium">Stato</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <QuoteRow
                  key={r.id}
                  id={r.id}
                  siteLabel={`${r.site.client.name} — ${r.site.name}`}
                  serviceLabel={serviceLabels[r.serviceType]}
                  listPrice={r.listPrice}
                  prezzoVenduto={r.prezzoVenduto}
                  discountPct={r.discountPct}
                  status={r.status}
                  note={r.note}
                />
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-zinc-400">
                    Nessun preventivo ancora creato.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
