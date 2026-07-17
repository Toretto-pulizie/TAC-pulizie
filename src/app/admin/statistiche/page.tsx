import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { AdminNav } from "../AdminNav";
import { computeListPrice, computeDiscountPct } from "@/lib/quotes";
import { computeSiteTotals, computeTotals } from "@/lib/timeCalc";
import { monthRange, MONTH_LABELS } from "@/lib/dates";

function formatEuro(n: number) {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

function formatPct(n: number) {
  return `${(n * 100).toFixed(0)}%`;
}

export default async function StatistichePage() {
  await requireAdmin();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const sixMonthsAgo = new Date(currentYear, now.getMonth() - 5, 1);

  const { start: curStart, end: curEnd } = monthRange(currentYear, currentMonth);

  const [
    quotesLast6Months,
    acceptedQuotes,
    currentMonthEntries,
    employees,
    totClienti,
    clientiConDatiFiscali,
    totCantieri,
    cantieriGeoreferenziati,
  ] = await Promise.all([
    prisma.quote.findMany({ where: { createdAt: { gte: sixMonthsAgo } } }),
    prisma.quote.findMany({
      where: { status: "ACCETTATO" },
      include: { site: { include: { client: true } } },
    }),
    prisma.timeEntry.findMany({
      where: { timestamp: { gte: curStart, lte: curEnd } },
      select: { userId: true, siteId: true, type: true, timestamp: true },
    }),
    prisma.user.findMany({ where: { role: "EMPLOYEE" }, orderBy: { name: "asc" } }),
    prisma.client.count(),
    prisma.client.count({
      where: { OR: [{ partitaIva: { not: null } }, { codiceFiscale: { not: null } }] },
    }),
    prisma.site.count(),
    prisma.site.count({ where: { lat: { not: null } } }),
  ]);

  // --- Andamento preventivi (ultimi 6 mesi) ---
  const monthsWindow: { year: number; month: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentYear, now.getMonth() - i, 1);
    monthsWindow.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }

  const trend = monthsWindow.map(({ year, month }) => {
    const { start, end } = monthRange(year, month);
    const inMonth = quotesLast6Months.filter(
      (q) => q.createdAt >= start && q.createdAt <= end
    );
    const accettati = inMonth.filter((q) => q.status === "ACCETTATO");
    const rifiutati = inMonth.filter((q) => q.status === "RIFIUTATO");
    const decisi = accettati.length + rifiutati.length;
    const tassoConversione = decisi > 0 ? accettati.length / decisi : null;
    const valoreVenduto = accettati.reduce((s, q) => s + (q.prezzoVenduto ?? 0), 0);
    const sconti = accettati
      .filter((q) => q.prezzoVenduto != null)
      .map((q) => computeDiscountPct(computeListPrice(q), q.prezzoVenduto!))
      .filter((d): d is number => d != null);
    const scontoMedio =
      sconti.length > 0 ? sconti.reduce((a, b) => a + b, 0) / sconti.length : null;

    return {
      label: `${MONTH_LABELS[month - 1].slice(0, 3)} ${year}`,
      creati: inMonth.length,
      accettati: accettati.length,
      tassoConversione,
      valoreVenduto,
      scontoMedio,
    };
  });

  const maxValoreVenduto = Math.max(1, ...trend.map((t) => t.valoreVenduto));

  // --- Marginalità cantieri (mese corrente) ---
  const siteTotals = computeSiteTotals(currentMonthEntries);
  const margini = acceptedQuotes
    .map((q) => {
      const totals = siteTotals.get(q.siteId) ?? { travelMinutes: 0, workMinutes: 0 };
      const oreLavorate = totals.workMinutes / 60;
      const contrattoMensile = q.prezzoVenduto ?? 0;
      const euroConsuntivo = oreLavorate * q.tariffaConsuntivo;
      const scostamento = euroConsuntivo - contrattoMensile;
      return {
        id: q.id,
        siteLabel: `${q.site.client.name} — ${q.site.name}`,
        contrattoMensile,
        oreLavorate,
        euroConsuntivo,
        scostamento,
      };
    })
    .sort((a, b) => a.scostamento - b.scostamento);

  // --- Ore lavorate per dipendente (mese corrente) ---
  const userTotals = computeTotals(currentMonthEntries);
  const oreDipendenti = employees
    .map((u) => {
      const t = userTotals.get(u.id) ?? { travelMinutes: 0, workMinutes: 0 };
      const oreLavorate = t.workMinutes / 60;
      const oreSpostamento = t.travelMinutes / 60;
      const totale = oreLavorate + oreSpostamento;
      return {
        id: u.id,
        nome: `${u.name} ${u.cognome ?? ""}`.trim(),
        oreLavorate,
        oreSpostamento,
        pctSpostamento: totale > 0 ? oreSpostamento / totale : 0,
      };
    })
    .sort((a, b) => b.oreLavorate - a.oreLavorate);

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="statistiche" />
      <div className="flex flex-col gap-8 p-4 sm:p-8">
        <section className="flex flex-col gap-3">
          <h1 className="text-lg font-semibold text-zinc-900">
            Andamento preventivi (ultimi 6 mesi)
          </h1>
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Mese</th>
                  <th className="px-4 py-3 font-medium">Creati</th>
                  <th className="px-4 py-3 font-medium">Accettati</th>
                  <th className="px-4 py-3 font-medium">Tasso conversione</th>
                  <th className="px-4 py-3 font-medium">Sconto medio</th>
                  <th className="px-4 py-3 font-medium">Valore venduto</th>
                </tr>
              </thead>
              <tbody>
                {trend.map((t) => (
                  <tr key={t.label} className="border-b border-zinc-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-zinc-900">{t.label}</td>
                    <td className="px-4 py-3 text-zinc-500">{t.creati}</td>
                    <td className="px-4 py-3 text-zinc-500">{t.accettati}</td>
                    <td className="px-4 py-3 text-zinc-500">
                      {t.tassoConversione != null ? formatPct(t.tassoConversione) : "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {t.scontoMedio != null ? formatPct(t.scontoMedio) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-zinc-100">
                          <div
                            className="h-2 rounded-full bg-zinc-900"
                            style={{
                              width: `${(t.valoreVenduto / maxValoreVenduto) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-zinc-700">
                          {formatEuro(t.valoreVenduto)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900">
              Marginalità cantieri — mese corrente
            </h1>
            <p className="text-sm text-zinc-500">
              Ore realmente lavorate (consuntivo) confrontate col contratto
              mensile venduto. In rosso i cantieri da tenere d&apos;occhio.
            </p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Cliente / cantiere</th>
                  <th className="px-4 py-3 font-medium">Contratto mensile</th>
                  <th className="px-4 py-3 font-medium">Ore lavorate</th>
                  <th className="px-4 py-3 font-medium">Euro consuntivo</th>
                  <th className="px-4 py-3 font-medium">Scostamento</th>
                </tr>
              </thead>
              <tbody>
                {margini.map((m) => (
                  <tr key={m.id} className="border-b border-zinc-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-zinc-900">
                      {m.siteLabel}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {formatEuro(m.contrattoMensile)}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {m.oreLavorate.toFixed(1)}h
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {formatEuro(m.euroConsuntivo)}
                    </td>
                    <td
                      className={`px-4 py-3 font-medium ${
                        m.scostamento < 0 ? "text-red-600" : "text-green-700"
                      }`}
                    >
                      {formatEuro(m.scostamento)}
                    </td>
                  </tr>
                ))}
                {margini.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-zinc-400">
                      Nessun contratto accettato al momento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h1 className="text-lg font-semibold text-zinc-900">
            Ore lavorate per dipendente — mese corrente
          </h1>
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Dipendente</th>
                  <th className="px-4 py-3 font-medium">Ore lavorate</th>
                  <th className="px-4 py-3 font-medium">Ore spostamento</th>
                  <th className="px-4 py-3 font-medium">% spostamento</th>
                </tr>
              </thead>
              <tbody>
                {oreDipendenti.map((o) => (
                  <tr key={o.id} className="border-b border-zinc-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-zinc-900">{o.nome}</td>
                    <td className="px-4 py-3 text-zinc-500">
                      {o.oreLavorate.toFixed(1)}h
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {o.oreSpostamento.toFixed(1)}h
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {formatPct(o.pctSpostamento)}
                    </td>
                  </tr>
                ))}
                {oreDipendenti.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-zinc-400">
                      Nessun dipendente ancora registrato.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h1 className="text-lg font-semibold text-zinc-900">
            Qualità anagrafica
          </h1>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-zinc-500">Clienti totali</p>
              <p className="text-xl font-semibold text-zinc-900">{totClienti}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-zinc-500">Con P.IVA/Cod.Fiscale</p>
              <p className="text-xl font-semibold text-zinc-900">
                {clientiConDatiFiscali} / {totClienti}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-zinc-500">Cantieri totali</p>
              <p className="text-xl font-semibold text-zinc-900">{totCantieri}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-zinc-500">Georeferenziati</p>
              <p className="text-xl font-semibold text-zinc-900">
                {cantieriGeoreferenziati} / {totCantieri}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
