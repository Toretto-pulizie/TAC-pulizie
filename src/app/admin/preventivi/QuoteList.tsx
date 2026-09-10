"use client";

import { useState } from "react";
import { QuoteRow } from "./QuoteRow";
import { ExcelHeader } from "@/app/ExcelHeader";
import { passesColumnFilters } from "@/lib/excelFilter";
import { compareValues } from "@/lib/sort";

type PerSite = {
  siteAddress: string;
  cadenza: string;
  listPrice: number;
  discountPct: number | null;
  netto: number;
  vendita: number;
};

type QuoteRowData = {
  id: string;
  numeroOfferta: number;
  clientName: string;
  // Comune a tutto il preventivo, non varia per sede.
  tipoServizio: string;
  siteCount: number;
  perSite: PerSite[];
  // null quando le sedi non condividono la stessa cadenza: in quel caso la
  // riga mostra "Vario" invece di ripetere e andare a capo con tutti i
  // valori in una cella (il dettaglio per sede si vede espandendo).
  cadenza: string | null;
  listPrice: number;
  netto: number;
  vendita: number;
  discountPct: number | null;
  status: "IN_TRATTATIVA" | "ACCETTATO" | "RIFIUTATO";
};

const statusLabels: Record<QuoteRowData["status"], string> = {
  IN_TRATTATIVA: "In trattativa",
  ACCETTATO: "Accettato",
  RIFIUTATO: "Rifiutato",
};

function formatEuro(n: number) {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

type FilterState = Record<string, string>;

export function QuoteList({ rows }: { rows: QuoteRowData[] }) {
  const [filters, setFilters] = useState<FilterState>({});
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const rowsForFilter = rows.map((r) => ({
    ...r,
    statusLabel: statusLabels[r.status],
    siteCountLabel: String(r.siteCount),
    cadenzaLabel: r.cadenza ?? "Vario",
    listPriceLabel: formatEuro(r.listPrice),
    nettoLabel: formatEuro(r.netto),
    venditaLabel: formatEuro(r.vendita),
    discountLabel: r.discountPct != null ? `${(r.discountPct * 100).toFixed(0)}%` : null,
  }));

  const filtered = rowsForFilter.filter((r) => passesColumnFilters(r, filters));

  const sorted = sortKey
    ? [...filtered].sort((a, b) =>
        compareValues(
          (a as unknown as Record<string, string | number | null>)[sortKey] ?? "",
          (b as unknown as Record<string, string | number | null>)[sortKey] ?? "",
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
      <section className="overflow-x-auto rounded-xl border border-zinc-200 bg-white [contain:inline-size]">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
            <tr>
              <ExcelHeader label="Cliente" active={filters.clientName} onFilterChange={(v) => handleFilterChange("clientName", v)} sortDir={sortDirFor("clientName")} onSort={(d) => handleSort("clientName", d)} />
              <ExcelHeader label="N° sedi/cantieri" active={filters.siteCountLabel} onFilterChange={(v) => handleFilterChange("siteCountLabel", v)} sortDir={sortDirFor("siteCount")} onSort={(d) => handleSort("siteCount", d)} />
              <ExcelHeader label="Tipo servizio" active={filters.tipoServizio} onFilterChange={(v) => handleFilterChange("tipoServizio", v)} sortDir={sortDirFor("tipoServizio")} onSort={(d) => handleSort("tipoServizio", d)} />
              <ExcelHeader label="Cadenza" active={filters.cadenzaLabel} onFilterChange={(v) => handleFilterChange("cadenzaLabel", v)} sortDir={sortDirFor("cadenzaLabel")} onSort={(d) => handleSort("cadenzaLabel", d)} />
              <ExcelHeader label="Listino" active={filters.listPriceLabel} onFilterChange={(v) => handleFilterChange("listPriceLabel", v)} sortDir={sortDirFor("listPrice")} onSort={(d) => handleSort("listPrice", d)} />
              <ExcelHeader label="Sconto" active={filters.discountLabel} onFilterChange={(v) => handleFilterChange("discountLabel", v)} sortDir={sortDirFor("discountPct")} onSort={(d) => handleSort("discountPct", d)} />
              <ExcelHeader label="Netto" active={filters.nettoLabel} onFilterChange={(v) => handleFilterChange("nettoLabel", v)} sortDir={sortDirFor("netto")} onSort={(d) => handleSort("netto", d)} />
              <ExcelHeader label="Vendita" active={filters.venditaLabel} onFilterChange={(v) => handleFilterChange("venditaLabel", v)} sortDir={sortDirFor("vendita")} onSort={(d) => handleSort("vendita", d)} />
              <ExcelHeader label="Stato" active={filters.statusLabel} onFilterChange={(v) => handleFilterChange("statusLabel", v)} sortDir={sortDirFor("statusLabel")} onSort={(d) => handleSort("statusLabel", d)} />
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <QuoteRow
                key={r.id}
                id={r.id}
                clientName={r.clientName}
                siteCount={r.siteCount}
                perSite={r.perSite}
                tipoServizio={r.tipoServizio}
                cadenza={r.cadenza}
                listPrice={r.listPrice}
                netto={r.netto}
                vendita={r.vendita}
                discountPct={r.discountPct}
                status={r.status}
              />
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-zinc-400">
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
