import { requireModule } from "@/lib/dal";
import { MONTH_LABELS, monthRange } from "@/lib/dates";
import { loadCommesse } from "@/lib/commesseData";
import { CommesseList } from "./CommesseList";

function formatEuro(n: number) {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

export default async function CommessePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  await requireModule("commesse");
  const params = await searchParams;

  const now = new Date();
  const year = params.year ? parseInt(params.year, 10) : null;
  const month = params.month ? parseInt(params.month, 10) : null;

  // Nessun filtro = dall'inizio a oggi. Solo anno = tutto l'anno; con il
  // mese = quel mese; solo mese = quel mese dell'anno corrente.
  let range: { start: Date; end: Date } | null = null;
  if (year && month) {
    range = monthRange(year, month);
  } else if (year) {
    range = {
      start: new Date(year, 0, 1, 0, 0, 0, 0),
      end: new Date(year, 11, 31, 23, 59, 59, 999),
    };
  } else if (month) {
    range = monthRange(now.getFullYear(), month);
  }

  const rows = await loadCommesse(range);

  const totContratto = rows.reduce((s, r) => s + r.contratto, 0);
  const totConsuntivo = rows.reduce((s, r) => s + r.consuntivo, 0);
  const totFatturato = rows.reduce((s, r) => s + r.fatturato, 0);

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div className="flex flex-col gap-6 px-4 py-4 sm:px-8 sm:py-8">
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Contrattualizzato", value: totContratto },
          { label: "Consuntivato", value: totConsuntivo },
          { label: "Fatturato", value: totFatturato },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">{c.label}</p>
            <p className="text-xl font-semibold text-zinc-900">{formatEuro(c.value)}</p>
          </div>
        ))}
      </section>

      <form className="flex flex-wrap items-end gap-3" method="get">
        <label className="flex flex-col gap-1 text-sm">
          Anno
          <select
            name="year"
            defaultValue={year ?? ""}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          >
            <option value="">Tutti</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Mese
          <select
            name="month"
            defaultValue={month ?? ""}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          >
            <option value="">Tutti</option>
            {MONTH_LABELS.map((label, i) => (
              <option key={label} value={i + 1}>
                {label}
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
        <p className="text-xs text-zinc-400">
          {range
            ? "Ore, consuntivo e fatture del periodo scelto."
            : "Dall'inizio a oggi: tutte le ore, il consuntivo e le fatture registrate."}
        </p>
      </form>

      <CommesseList rows={rows} />
    </div>
  );
}
