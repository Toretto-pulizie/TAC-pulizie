"use client";

import { useState } from "react";
import { QuoteRow } from "./QuoteRow";
import { ExcelHeader } from "@/app/ExcelHeader";
import { passesColumnFilters } from "@/lib/excelFilter";
import { compareValues } from "@/lib/sort";

type QuoteRowData = {
  id: string;
  numeroOfferta: number;
  siteLabel: string;
  serviceLabel: string;
  listPrice: number;
  prezzoVenduto: number | null;
  discountPct: number | null;
  status: "IN_TRATTATIVA" | "ACCETTATO" | "RIFIUTATO";
};

const statusLabels: Record<QuoteRowData["status"], string> = {
  IN_TRATTATIVA: "In trattativa",
  ACCETTATO: "Accettato",
  RIFIUTATO: "Rifiutato",
};

function formatEuro(n: number | null) {
  return n == null
    ? null
    : n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

type FilterState = Record<string, Set<string> | null>;

export function QuoteList({ rows }: { rows: QuoteRowData[] }) {
  const [filters, setFilters] = useState<FilterState>({});
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const rowsForFilter = rows.map((r) => ({
    ...r,
    statusLabel: statusLabels[r.status],
    listPriceLabel: formatEuro(r.listPrice),
    prezzoVendutoLabel: formatEuro(r.prezzoVenduto),
    discountLabel: r.discountPct != null ? `${(r.discountPct * 100).toFixed(0)}%` : null,
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
  function handleFilterChange(key: string, next: Set<string> | null) {
    setFilters((f) => ({ ...f, [key]: next }));
  }
  const sortDirFor = (key: string) => (sortKey === key ? sortDir : null);

  return (
    <div className="flex flex-col gap-3">
      <section className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
            <tr>
              <ExcelHeader label="Cliente / cantiere" values={rowsForFilter.map((r) => r.siteLabel)} active={filters.siteLabel} onFilterChange={(v) => handleFilterChange("siteLabel", v)} sortDir={sortDirFor("siteLabel")} onSort={(d) => handleSort("siteLabel", d)} />
              <ExcelHeader label="Servizio" values={rowsForFilter.map((r) => r.serviceLabel)} active={filters.serviceLabel} onFilterChange={(v) => handleFilterChange("serviceLabel", v)} sortDir={sortDirFor("serviceLabel")} onSort={(d) => handleSort("serviceLabel", d)} />
              <ExcelHeader label="Prezzo listino" values={rowsForFilter.map((r) => r.listPriceLabel)} active={filters.listPriceLabel} onFilterChange={(v) => handleFilterChange("listPriceLabel", v)} sortDir={sortDirFor("listPrice")} onSort={(d) => handleSort("listPrice", d)} />
              <ExcelHeader label="Prezzo venduto" values={rowsForFilter.map((r) => r.prezzoVendutoLabel)} active={filters.prezzoVendutoLabel} onFilterChange={(v) => handleFilterChange("prezzoVendutoLabel", v)} sortDir={sortDirFor("prezzoVenduto")} onSort={(d) => handleSort("prezzoVenduto", d)} />
              <ExcelHeader label="Sconto" values={rowsForFilter.map((r) => r.discountLabel)} active={filters.discountLabel} onFilterChange={(v) => handleFilterChange("discountLabel", v)} sortDir={sortDirFor("discountPct")} onSort={(d) => handleSort("discountPct", d)} />
              <ExcelHeader label="Stato" values={rowsForFilter.map((r) => r.statusLabel)} active={filters.statusLabel} onFilterChange={(v) => handleFilterChange("statusLabel", v)} sortDir={sortDirFor("statusLabel")} onSort={(d) => handleSort("statusLabel", d)} />
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <QuoteRow
                key={r.id}
                id={r.id}
                siteLabel={r.siteLabel}
                serviceLabel={r.serviceLabel}
                listPrice={r.listPrice}
                prezzoVenduto={r.prezzoVenduto}
                discountPct={r.discountPct}
                status={r.status}
              />
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-zinc-400">
                  {rows.length === 0
                    ? "Nessun preventivo ancora creato."
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
