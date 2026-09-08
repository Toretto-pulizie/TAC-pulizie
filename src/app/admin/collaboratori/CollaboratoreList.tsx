"use client";

import { useState } from "react";
import { CollaboratoreRow } from "./CollaboratoreRow";
import { ExcelHeader } from "@/app/ExcelHeader";
import { passesColumnFilters } from "@/lib/excelFilter";
import { compareValues } from "@/lib/sort";

type Collaboratore = {
  id: string;
  codiceCollaboratore: number;
  nome: string;
  cognome: string | null;
  codiceFiscale: string | null;
  indirizzo: string | null;
  citta: string | null;
  telefono: string | null;
  email: string | null;
  note: string | null;
};

type FilterState = Record<string, Set<string> | null>;

export function CollaboratoreList({
  collaboratori,
}: {
  collaboratori: Collaboratore[];
}) {
  const [filters, setFilters] = useState<FilterState>({});
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const rowsForFilter = collaboratori.map((c) => ({
    ...c,
    codice: String(c.codiceCollaboratore).padStart(4, "0"),
    denominazione: `${c.cognome ?? ""} ${c.nome}`.trim(),
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
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
            <tr>
              <ExcelHeader label="Codice" values={rowsForFilter.map((r) => r.codice)} active={filters.codice} onFilterChange={(v) => handleFilterChange("codice", v)} sortDir={sortDirFor("codice")} onSort={(d) => handleSort("codice", d)} />
              <ExcelHeader label="Denominazione" values={rowsForFilter.map((r) => r.denominazione)} active={filters.denominazione} onFilterChange={(v) => handleFilterChange("denominazione", v)} sortDir={sortDirFor("denominazione")} onSort={(d) => handleSort("denominazione", d)} />
              <ExcelHeader label="Città" values={rowsForFilter.map((r) => r.citta)} active={filters.citta} onFilterChange={(v) => handleFilterChange("citta", v)} sortDir={sortDirFor("citta")} onSort={(d) => handleSort("citta", d)} />
              <ExcelHeader label="Telefono" values={rowsForFilter.map((r) => r.telefono)} active={filters.telefono} onFilterChange={(v) => handleFilterChange("telefono", v)} sortDir={sortDirFor("telefono")} onSort={(d) => handleSort("telefono", d)} />
              <ExcelHeader label="Email" values={rowsForFilter.map((r) => r.email)} active={filters.email} onFilterChange={(v) => handleFilterChange("email", v)} sortDir={sortDirFor("email")} onSort={(d) => handleSort("email", d)} />
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => (
              <CollaboratoreRow
                key={c.id}
                id={c.id}
                codiceCollaboratore={c.codiceCollaboratore}
                nome={c.nome}
                cognome={c.cognome}
                citta={c.citta}
                telefono={c.telefono}
                email={c.email}
              />
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-zinc-400">
                  {collaboratori.length === 0
                    ? "Nessun collaboratore ancora."
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
