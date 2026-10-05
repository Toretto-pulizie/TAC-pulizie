"use client";

import { useState } from "react";
import { Trunc } from "@/app/Trunc";
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

type Stato = "FATTURATA" | NonNullable<CommessaRow["offerStato"]> | "SENZA_OFFERTA";

// Una sola voce: se ci sono fatture emesse conta "Fatturata" (l'offerta è già
// andata avanti, "Accettata" sarebbe ridondante); le bozze non contano.
function statoOf(r: CommessaRow): Stato {
  if (r.ftStato === "FATTURATA") return "FATTURATA";
  return r.offerStato ?? "SENZA_OFFERTA";
}

const STATO_LABELS: Record<Stato, string> = {
  FATTURATA: "Fatturata",
  ...OFFER_LABELS,
  SENZA_OFFERTA: "Senza offerta",
};

const STATO_CLASSES: Record<Stato, string> = {
  FATTURATA: "bg-blue-100 text-blue-700",
  ...OFFER_CLASSES,
  SENZA_OFFERTA: "bg-zinc-100 text-zinc-500",
};

type Row = CommessaRow & {
  statoLabel: string;
  numeriLabel: string;
  numeroMax: number;
  cantieriLabel: string;
  mensileLabel: string;
  annuoLabel: string;
  oreLabel: string;
  spostLabel: string;
  consuntivoLabel: string;
  scostamentoLabel: string;
  nFattureLabel: string;
  fatturatoLabel: string;
};

export function CommesseList({ rows }: { rows: CommessaRow[] }) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const rowsForFilter: Row[] = rows.map((r) => ({
    ...r,
    statoLabel: STATO_LABELS[statoOf(r)],
    numeriLabel: r.numeri.join(", "),
    numeroMax: Math.max(0, ...r.numeri),
    cantieriLabel: String(r.cantieri),
    mensileLabel: r.mensile ? formatEuro(r.mensile) : "—",
    annuoLabel: r.annuo ? formatEuro(r.annuo) : "—",
    oreLabel: formatOre(r.oreLavorate),
    spostLabel: formatOre(r.oreSpostamento),
    consuntivoLabel: r.consuntivo ? formatEuro(r.consuntivo) : "—",
    scostamentoLabel: r.scostamento != null ? formatEuro(r.scostamento) : "—",
    nFattureLabel: String(r.nFatture),
    fatturatoLabel: r.fatturato ? formatEuro(r.fatturato) : "—",
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
            {col("N°", "numeriLabel", "numeroMax")}
            {col("Cliente", "clientName", "clientName")}
            {col("Stato", "statoLabel", "statoLabel")}
            {col("Cantieri", "cantieriLabel", "cantieri")}
            {col("Ore lavorate", "oreLabel", "oreLavorate")}
            {col("Ore spost.", "spostLabel", "oreSpostamento")}
            {col("N° FT", "nFattureLabel", "nFatture")}
            {col("Mensile", "mensileLabel", "mensile")}
            {col("Annuo", "annuoLabel", "annuo")}
            {col("Consuntivo", "consuntivoLabel", "consuntivo")}
            {col("Scostamento", "scostamentoLabel", "scostamento")}
            {col("Fatturato", "fatturatoLabel", "fatturato")}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.clientId} className="border-b border-zinc-100 last:border-0">
              <td className="px-3 py-3 font-medium text-zinc-900">{r.numeriLabel || "—"}</td>
              <td className="px-3 py-3 font-medium text-zinc-900">
                <Trunc text={r.clientName} />
              </td>
              <td className="px-3 py-3">
                <span className={`rounded-full px-2 py-1 text-xs ${STATO_CLASSES[statoOf(r)]}`}>
                  {STATO_LABELS[statoOf(r)]}
                </span>
              </td>
              <td className="px-3 py-3 text-zinc-500">{r.cantieri || "—"}</td>
              <td className="px-3 py-3 text-zinc-500">{r.oreLabel}</td>
              <td className="px-3 py-3 text-zinc-500">{r.spostLabel}</td>
              <td className="px-3 py-3 text-zinc-500">{r.nFatture || "—"}</td>
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
              <td className="px-3 py-3 text-zinc-500">{r.fatturatoLabel}</td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={12} className="px-4 py-6 text-center text-zinc-400">
                {rows.length === 0 ? "Nessuna commessa ancora." : "Nessun risultato."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
