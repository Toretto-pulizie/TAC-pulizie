"use client";

import Link from "next/link";
import { useState } from "react";
import { Trunc } from "@/app/Trunc";
import { ExcelHeader } from "@/app/ExcelHeader";
import { passesColumnFilters } from "@/lib/excelFilter";
import { compareValues } from "@/lib/sort";
import { SiteActions } from "../clienti/SiteActions";

type SedeRow = {
  id: string;
  cliente: string;
  clientId: string;
  nome: string;
  indirizzo: string;
  accesso: boolean;
  capienza: number | null;
  offerte: number[];
};

type FilterState = Record<string, string>;

export function SedeList({ rows }: { rows: SedeRow[] }) {
  const [filters, setFilters] = useState<FilterState>({});
  const [sortKey, setSortKey] = useState<string | null>("cliente");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const rowsForFilter = rows.map((r) => ({
    ...r,
    accessoLabel: r.accesso ? "sì" : "no",
    capienzaLabel: r.capienza != null ? String(r.capienza) : "—",
    offerteLabel: r.offerte.length > 0 ? r.offerte.join(", ") : "—",
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
  const head = (label: string, filterKey: string, sortBy: string) => (
    <ExcelHeader
      label={label}
      active={filters[filterKey]}
      onFilterChange={(v) => handleFilterChange(filterKey, v)}
      sortDir={sortDirFor(sortBy)}
      onSort={(d) => handleSort(sortBy, d)}
    />
  );

  return (
    <section className="overflow-x-auto rounded-xl border border-zinc-200 bg-white [contain:inline-size]">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
          <tr>
            {head("Cliente", "cliente", "cliente")}
            {head("Sede/cantiere", "nome", "nome")}
            {head("Indirizzo", "indirizzo", "indirizzo")}
            {head("Chiavi/codici", "accessoLabel", "accessoLabel")}
            {head("Capienza", "capienzaLabel", "capienza")}
            {head("Offerte accettate", "offerteLabel", "offerteLabel")}
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.id} className="border-b border-zinc-100 last:border-0">
              <td className="px-3 py-3 font-medium text-zinc-900">
                <Link prefetch={false} href={`/admin/clienti/${r.clientId}`} className="hover:underline">
                  <Trunc text={r.cliente} />
                </Link>
              </td>
              <td className="px-3 py-3 text-zinc-900">
                <Trunc text={r.nome} />
              </td>
              <td className="px-3 py-3 text-zinc-500">{r.indirizzo}</td>
              <td className="px-3 py-3">
                <span
                  className={`rounded-full px-2 py-1 text-xs ${
                    r.accesso ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  {r.accessoLabel}
                </span>
              </td>
              <td className="px-3 py-3 text-zinc-500">{r.capienzaLabel}</td>
              <td className="px-3 py-3 text-zinc-500">{r.offerteLabel}</td>
              <td className="px-3 py-3 text-right">
                <SiteActions siteId={r.id} />
              </td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={7} className="px-3 py-6 text-center text-zinc-400">
                {rows.length === 0 ? "Nessuna sede ancora." : "Nessun risultato."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
