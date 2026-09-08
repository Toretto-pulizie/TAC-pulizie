"use client";

import { useState } from "react";
import { ExcelHeader } from "@/app/ExcelHeader";
import { passesColumnFilters } from "@/lib/excelFilter";
import { compareValues } from "@/lib/sort";

type ConsuntivoRow = {
  id: string;
  siteLabel: string;
  contrattoMensile: number;
  oreLavorate: number;
  oreSpostamento: number;
  euroConsuntivo: number;
  scostamento: number;
  scostamentoPct: number | null;
};

function formatEuro(n: number) {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

type FilterState = Record<string, string>;

export function ConsuntiviList({ rows }: { rows: ConsuntivoRow[] }) {
  const [filters, setFilters] = useState<FilterState>({});
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const rowsForFilter = rows.map((r) => ({
    ...r,
    contrattoMensileLabel: formatEuro(r.contrattoMensile),
    oreLavorateLabel: `${r.oreLavorate.toFixed(1)}h`,
    oreSpostamentoLabel: `${r.oreSpostamento.toFixed(1)}h`,
    euroConsuntivoLabel: formatEuro(r.euroConsuntivo),
    scostamentoLabel: formatEuro(r.scostamento),
  }));

  const filtered = rowsForFilter.filter((r) => passesColumnFilters(r, filters));

  const sorted = sortKey
    ? [...filtered].sort((a, b) =>
        compareValues(
          (a as Record<string, string | number | null>)[sortKey] ?? "",
          (b as Record<string, string | number | null>)[sortKey] ?? "",
          sortDir
        )
      )
    : filtered;

  function handleSort(key: string, dir: "asc" | "desc") {
    setSortKey(key);
    setSortDir(dir);
  }
  function handleFilterChange(key: string, next: string) {
    setFilters((f) => ({ ...f, [key]: next }));
  }
  const sortDirFor = (key: string) => (sortKey === key ? sortDir : null);

  return (
    <div className="flex flex-col gap-3">
      <section className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
            <tr>
              <ExcelHeader label="Cliente / cantiere" active={filters.siteLabel} onFilterChange={(v) => handleFilterChange("siteLabel", v)} sortDir={sortDirFor("siteLabel")} onSort={(d) => handleSort("siteLabel", d)} />
              <ExcelHeader label="Contratto mensile" active={filters.contrattoMensileLabel} onFilterChange={(v) => handleFilterChange("contrattoMensileLabel", v)} sortDir={sortDirFor("contrattoMensile")} onSort={(d) => handleSort("contrattoMensile", d)} />
              <ExcelHeader label="Ore lavorate" active={filters.oreLavorateLabel} onFilterChange={(v) => handleFilterChange("oreLavorateLabel", v)} sortDir={sortDirFor("oreLavorate")} onSort={(d) => handleSort("oreLavorate", d)} />
              <ExcelHeader label="Ore spostamento" active={filters.oreSpostamentoLabel} onFilterChange={(v) => handleFilterChange("oreSpostamentoLabel", v)} sortDir={sortDirFor("oreSpostamento")} onSort={(d) => handleSort("oreSpostamento", d)} />
              <ExcelHeader label="Euro consuntivo" active={filters.euroConsuntivoLabel} onFilterChange={(v) => handleFilterChange("euroConsuntivoLabel", v)} sortDir={sortDirFor("euroConsuntivo")} onSort={(d) => handleSort("euroConsuntivo", d)} />
              <ExcelHeader label="Scostamento" active={filters.scostamentoLabel} onFilterChange={(v) => handleFilterChange("scostamentoLabel", v)} sortDir={sortDirFor("scostamento")} onSort={(d) => handleSort("scostamento", d)} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id} className="border-b border-zinc-100 last:border-0">
                <td className="px-4 py-3 font-medium text-zinc-900">{r.siteLabel}</td>
                <td className="px-4 py-3 text-zinc-500">{formatEuro(r.contrattoMensile)}</td>
                <td className="px-4 py-3 text-zinc-500">{r.oreLavorate.toFixed(1)}h</td>
                <td className="px-4 py-3 text-zinc-500">{r.oreSpostamento.toFixed(1)}h</td>
                <td className="px-4 py-3 text-zinc-500">{formatEuro(r.euroConsuntivo)}</td>
                <td
                  className={`px-4 py-3 font-medium ${
                    r.scostamento < 0 ? "text-red-600" : "text-green-700"
                  }`}
                >
                  {formatEuro(r.scostamento)}
                  {r.scostamentoPct != null && (
                    <span className="ml-1 text-xs text-zinc-400">
                      ({(r.scostamentoPct * 100).toFixed(0)}%)
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-zinc-400">
                  {rows.length === 0
                    ? "Nessun contratto accettato al momento."
                    : "Nessun risultato."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
