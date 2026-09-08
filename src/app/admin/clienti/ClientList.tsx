"use client";

import { useState } from "react";
import { ClientRow } from "./ClientRow";
import { ExcelHeader } from "@/app/ExcelHeader";
import { passesColumnFilters } from "@/lib/excelFilter";
import { compareValues } from "@/lib/sort";

type Site = {
  id: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  capienza: number | null;
};

type Client = {
  id: string;
  codiceCliente: number;
  name: string;
  tipo: "AZIENDA" | "PERSONA_FISICA";
  nome: string | null;
  cognome: string | null;
  ragioneSociale: string | null;
  citta: string | null;
  telefono: string | null;
  email: string | null;
  partitaIva: string | null;
  codiceFiscale: string | null;
  personaRiferimento: string | null;
  sites: Site[];
};

type FilterState = Record<string, Set<string> | null>;

export function ClientList({ clients }: { clients: Client[] }) {
  const [filters, setFilters] = useState<FilterState>({});
  const [sortKey, setSortKey] = useState<string | null>("codice");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const rowsForFilter = clients.map((c) => ({
    ...c,
    codice: String(c.codiceCliente).padStart(6, "0"),
    tipoLabel: c.tipo === "AZIENDA" ? "Azienda" : "Privato",
    denominazioneSort:
      c.tipo === "PERSONA_FISICA"
        ? `${c.cognome ?? ""} ${c.nome ?? ""}`.trim()
        : (c.ragioneSociale ?? c.name),
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
              <ExcelHeader label="Codice" values={rowsForFilter.map((r) => r.codice)} active={filters.codice} onFilterChange={(v) => handleFilterChange("codice", v)} sortDir={sortDirFor("codice")} onSort={(d) => handleSort("codice", d)} />
              <ExcelHeader label="Tipo" values={rowsForFilter.map((r) => r.tipoLabel)} active={filters.tipoLabel} onFilterChange={(v) => handleFilterChange("tipoLabel", v)} sortDir={sortDirFor("tipoLabel")} onSort={(d) => handleSort("tipoLabel", d)} />
              <ExcelHeader label="Denominazione" values={rowsForFilter.map((r) => r.name)} active={filters.name} onFilterChange={(v) => handleFilterChange("name", v)} sortDir={sortDirFor("denominazioneSort")} onSort={(d) => handleSort("denominazioneSort", d)} />
              <ExcelHeader label="Città" values={rowsForFilter.map((r) => r.citta)} active={filters.citta} onFilterChange={(v) => handleFilterChange("citta", v)} sortDir={sortDirFor("citta")} onSort={(d) => handleSort("citta", d)} />
              <ExcelHeader label="Telefono" values={rowsForFilter.map((r) => r.telefono)} active={filters.telefono} onFilterChange={(v) => handleFilterChange("telefono", v)} sortDir={sortDirFor("telefono")} onSort={(d) => handleSort("telefono", d)} />
              <ExcelHeader label="Email" values={rowsForFilter.map((r) => r.email)} active={filters.email} onFilterChange={(v) => handleFilterChange("email", v)} sortDir={sortDirFor("email")} onSort={(d) => handleSort("email", d)} />
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => (
              <ClientRow
                key={c.id}
                clientId={c.id}
                codiceCliente={c.codiceCliente}
                name={c.name}
                tipo={c.tipo}
                citta={c.citta}
                telefono={c.telefono}
                email={c.email}
                editHref={`/admin/clienti/${c.id}`}
                sites={c.sites}
              />
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-zinc-400">
                  {clients.length === 0 ? "Nessun cliente ancora." : "Nessun risultato."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
