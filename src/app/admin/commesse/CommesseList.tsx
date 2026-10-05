"use client";

import { useState } from "react";
import { ExcelHeader } from "@/app/ExcelHeader";
import { passesColumnFilters } from "@/lib/excelFilter";
import { compareValues } from "@/lib/sort";
import type { CommessaRow } from "@/lib/commesse";

const OFFER_LABELS: Record<NonNullable<CommessaRow["offerStato"]>, string> = {
  ACCETTATA: "Accettata",
  IN_TRATTATIVA: "In trattativa",
  RIFIUTATA: "Rifiutata",
};

const OFFER_CLASSES: Record<NonNullable<CommessaRow["offerStato"]>, string> = {
  ACCETTATA: "bg-green-100 text-green-700",
  IN_TRATTATIVA: "bg-amber-100 text-amber-700",
  RIFIUTATA: "bg-zinc-100 text-zinc-500",
};

function formatEuro(n: number) {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

function formatOre(n: number) {
  return n === 0 ? "—" : `${n.toFixed(1)}h`;
}

type Row = CommessaRow & {
  statoLabel: string;
  numeriLabel: string;
  cantieriLabel: string;
  mensileLabel: string;
  annuoLabel: string;
  oreLabel: string;
  spostLabel: string;
  consuntivoLabel: string;
  scostamentoLabel: string;
  nFattureLabel: string;
  fatturatoLabel: string;
  daFatturareLabel: string;
};

export function CommesseList({ rows }: { rows: CommessaRow[] }) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const rowsForFilter: Row[] = rows.map((r) => ({
    ...r,
    statoLabel:
      [r.offerStato ? OFFER_LABELS[r.offerStato] : "Senza offerta", r.ftStato === "FATTURATA" ? "Fatturata" : r.ftStato === "BOZZA" ? "FT in bozza" : null]
        .filter(Boolean)
        .join(" · "),
    numeriLabel: r.numeri.join(", "),
    cantieriLabel: String(r.cantieri),
    mensileLabel: r.mensile ? formatEuro(r.mensile) : "—",
    annuoLabel: r.annuo ? formatEuro(r.annuo) : "—",
    oreLabel: formatOre(r.oreLavorate),
    spostLabel: formatOre(r.oreSpostamento),
    consuntivoLabel: r.consuntivo ? formatEuro(r.consuntivo) : "—",
    scostamentoLabel: r.scostamento != null ? formatEuro(r.scostamento) : "—",
    nFattureLabel: String(r.nFatture),
    fatturatoLabel: r.fatturato ? formatEuro(r.fatturato) : "—",
    daFatturareLabel: r.daFatturare != null ? formatEuro(r.daFatturare) : "—",
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

  const sortDirFor = (key: string) => (sortKey === key ? sortDir : null);
  const col = (label: string, filterKey: string, sortBy: string) => (
    <ExcelHeader
      key={filterKey}
      label={label}
      active={filters[filterKey]}
      onFilterChange={(v) => setFilters((f) => ({ ...f, [filterKey]: v }))}
      sortDir={sortDirFor(sortBy)}
      onSort={(d) => {
        setSortKey(sortBy);
        setSortDir(d);
      }}
    />
  );

  return (
    <section className="overflow-x-auto rounded-xl border border-zinc-200 bg-white [contain:inline-size]">
      <table className="w-full min-w-[1280px] text-left text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
          <tr>
            {col("Cliente", "clientName", "clientName")}
            {col("Stato", "statoLabel", "statoLabel")}
            {col("Offerte N°", "numeriLabel", "numeriLabel")}
            {col("Cantieri", "cantieriLabel", "cantieri")}
            {col("Mensile", "mensileLabel", "mensile")}
            {col("Annuo", "annuoLabel", "annuo")}
            {col("Ore lavorate", "oreLabel", "oreLavorate")}
            {col("Ore spost.", "spostLabel", "oreSpostamento")}
            {col("Consuntivo", "consuntivoLabel", "consuntivo")}
            {col("Scostamento", "scostamentoLabel", "scostamento")}
            {col("N° FT", "nFattureLabel", "nFatture")}
            {col("Fatturato", "fatturatoLabel", "fatturato")}
            {col("Ultima FT", "ultimaFattura", "ultimaFatturaTs")}
            {col("Da fatturare", "daFatturareLabel", "daFatturare")}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.clientId} className="border-b border-zinc-100 last:border-0">
              <td className="px-3 py-3 font-medium text-zinc-900">{r.clientName}</td>
              <td className="px-3 py-3">
                <div className="flex flex-wrap gap-1">
                  {r.offerStato ? (
                    <span className={`rounded-full px-2 py-1 text-xs ${OFFER_CLASSES[r.offerStato]}`}>
                      {OFFER_LABELS[r.offerStato]}
                    </span>
                  ) : (
                    <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-500">
                      Senza offerta
                    </span>
                  )}
                  {r.ftStato === "FATTURATA" && (
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
                      Fatturata
                    </span>
                  )}
                  {r.ftStato === "BOZZA" && (
                    <span className="rounded-full bg-violet-100 px-2 py-1 text-xs text-violet-700">
                      FT in bozza
                    </span>
                  )}
                </div>
              </td>
              <td className="px-3 py-3 text-zinc-500">{r.numeriLabel || "—"}</td>
              <td className="px-3 py-3 text-zinc-500">{r.cantieri || "—"}</td>
              <td
                className={`px-3 py-3 ${r.amountsFromPending ? "italic text-zinc-400" : "text-zinc-500"}`}
                title={r.amountsFromPending ? "Importo dell'offerta in trattativa" : undefined}
              >
                {r.mensileLabel}
              </td>
              <td
                className={`px-3 py-3 ${r.amountsFromPending ? "italic text-zinc-400" : "text-zinc-500"}`}
                title={r.amountsFromPending ? "Importo dell'offerta in trattativa" : undefined}
              >
                {r.annuoLabel}
              </td>
              <td className="px-3 py-3 text-zinc-500">{r.oreLabel}</td>
              <td className="px-3 py-3 text-zinc-500">{r.spostLabel}</td>
              <td className="px-3 py-3 text-zinc-500">{r.consuntivoLabel}</td>
              <td
                className={`px-3 py-3 font-medium ${
                  r.scostamento == null
                    ? "text-zinc-400"
                    : r.scostamento < 0
                      ? "text-red-600"
                      : "text-green-700"
                }`}
                title="Contrattualizzato meno consuntivo: negativo = il lavoro costa più di quanto contrattualizzato"
              >
                {r.scostamentoLabel}
              </td>
              <td className="px-3 py-3 text-zinc-500">{r.nFatture || "—"}</td>
              <td className="px-3 py-3 text-zinc-500">{r.fatturatoLabel}</td>
              <td className="px-3 py-3 whitespace-nowrap text-zinc-500">{r.ultimaFattura ?? "—"}</td>
              <td
                className="px-3 py-3 font-medium text-zinc-900"
                title="Contrattualizzato nel periodo meno quanto già fatturato"
              >
                {r.daFatturareLabel}
              </td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={14} className="px-4 py-6 text-center text-zinc-400">
                {rows.length === 0 ? "Nessuna commessa ancora." : "Nessun risultato."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
