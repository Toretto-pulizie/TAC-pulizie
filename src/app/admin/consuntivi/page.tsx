import { requireModule } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { computeSiteTotals } from "@/lib/timeCalc";
import { MONTH_LABELS, monthRange } from "@/lib/dates";
import { ConsuntiviList } from "./ConsuntiviList";

function formatEuro(n: number) {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

export default async function ConsuntiviPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  await requireModule("consuntivi");
  const params = await searchParams;

  const now = new Date();
  const year = params.year ? parseInt(params.year, 10) : now.getFullYear();
  const month = params.month ? parseInt(params.month, 10) : now.getMonth() + 1;
  const { start, end } = monthRange(year, month);

  const [quotes, entries] = await Promise.all([
    prisma.quote.findMany({
      where: { status: "ACCETTATO" },
      include: { site: { include: { client: true } } },
      orderBy: [{ site: { client: { name: "asc" } } }],
    }),
    prisma.timeEntry.findMany({
      where: { timestamp: { gte: start, lte: end } },
      select: { userId: true, siteId: true, type: true, timestamp: true },
    }),
  ]);

  const siteTotals = computeSiteTotals(entries);

  const rows = quotes.map((q) => {
    const totals = siteTotals.get(q.siteId) ?? { travelMinutes: 0, workMinutes: 0 };
    const contrattoMensile = q.prezzoVenduto ?? 0;
    const oreLavorate = totals.workMinutes / 60;
    const oreSpostamento = totals.travelMinutes / 60;
    const euroConsuntivo = oreLavorate * q.tariffaConsuntivo;
    const scostamento = euroConsuntivo - contrattoMensile;
    const scostamentoPct = contrattoMensile !== 0 ? scostamento / contrattoMensile : null;
    return {
      id: q.id,
      siteLabel: `${q.site.client.name} — ${q.site.name}`,
      contrattoMensile,
      oreLavorate,
      oreSpostamento,
      tariffaConsuntivo: q.tariffaConsuntivo,
      euroConsuntivo,
      scostamento,
      scostamentoPct,
    };
  });

  const totContratto = rows.reduce((s, r) => s + r.contrattoMensile, 0);
  const totConsuntivo = rows.reduce((s, r) => s + r.euroConsuntivo, 0);
  const totOreLavorate = rows.reduce((s, r) => s + r.oreLavorate, 0);
  const totOreSpostamento = rows.reduce((s, r) => s + r.oreSpostamento, 0);

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div className="flex flex-col gap-6 px-4 pt-20 pb-4 sm:px-8 sm:pt-24 sm:pb-8">
        <form className="flex flex-wrap items-end gap-3" method="get">
          <label className="flex flex-col gap-1 text-sm">
            Mese
            <select
              name="month"
              defaultValue={month}
              className="rounded-lg border border-zinc-300 px-3 py-2"
            >
              {MONTH_LABELS.map((label, i) => (
                <option key={label} value={i + 1}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Anno
            <select
              name="year"
              defaultValue={year}
              className="rounded-lg border border-zinc-300 px-3 py-2"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
          >
            Mostra
          </button>
        </form>

        <section className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Contrattualizzato</p>
            <p className="text-xl font-semibold text-zinc-900">
              {formatEuro(totContratto)}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Consuntivato</p>
            <p className="text-xl font-semibold text-zinc-900">
              {formatEuro(totConsuntivo)}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Ore lavorate</p>
            <p className="text-xl font-semibold text-zinc-900">
              {totOreLavorate.toFixed(1)}h
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Ore spostamento</p>
            <p className="text-xl font-semibold text-zinc-900">
              {totOreSpostamento.toFixed(1)}h
            </p>
          </div>
        </section>

        <ConsuntiviList rows={rows} />
    </div>
  );
}
