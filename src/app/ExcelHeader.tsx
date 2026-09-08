"use client";

import { useMemo, useState } from "react";
import { displayValue } from "@/lib/excelFilter";

export function ExcelHeader({
  label,
  values,
  active,
  onFilterChange,
  sortDir,
  onSort,
}: {
  label: string;
  values: (string | number | null | undefined)[];
  active: Set<string> | null | undefined;
  onFilterChange: (next: Set<string> | null) => void;
  sortDir: "asc" | "desc" | null;
  onSort: (dir: "asc" | "desc") => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const unique = useMemo(() => {
    const set = new Set(values.map(displayValue));
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, "it", { sensitivity: "base", numeric: true })
    );
  }, [values]);

  const selected = active ?? new Set(unique);
  const allSelected = active == null || selected.size === unique.length;
  const isFiltered = active != null;
  const filteredUnique = unique.filter((v) =>
    v.toLowerCase().includes(search.toLowerCase())
  );

  function toggleValue(v: string) {
    const next = new Set(selected);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    onFilterChange(next.size === unique.length ? null : next);
  }

  function toggleAll() {
    onFilterChange(allSelected ? new Set() : null);
  }

  return (
    <th className="relative px-3 py-2 font-medium select-none">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 hover:text-zinc-900"
      >
        {label}
        <span
          className={`text-[10px] ${isFiltered ? "text-zinc-900" : "text-zinc-400"}`}
        >
          {sortDir === "asc" ? "▲" : sortDir === "desc" ? "▼" : "▾"}
        </span>
        {isFiltered && (
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-900" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-20 mt-1 w-56 rounded-lg border border-zinc-200 bg-white p-2 text-xs font-normal normal-case text-zinc-700 shadow-lg">
            <button
              type="button"
              onClick={() => {
                onSort("asc");
                setOpen(false);
              }}
              className="block w-full rounded px-2 py-1.5 text-left hover:bg-zinc-100"
            >
              ▲ Ordina crescente
            </button>
            <button
              type="button"
              onClick={() => {
                onSort("desc");
                setOpen(false);
              }}
              className="block w-full rounded px-2 py-1.5 text-left hover:bg-zinc-100"
            >
              ▼ Ordina decrescente
            </button>

            <div className="my-2 border-t border-zinc-100" />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca valore..."
              className="mb-1.5 w-full rounded border border-zinc-300 px-2 py-1"
            />
            <label className="flex items-center gap-2 rounded px-2 py-1 font-medium hover:bg-zinc-100">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
              />
              (Seleziona tutto)
            </label>
            <div className="max-h-40 overflow-y-auto">
              {filteredUnique.map((v) => (
                <label
                  key={v}
                  className="flex items-center gap-2 rounded px-2 py-1 hover:bg-zinc-100"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(v)}
                    onChange={() => toggleValue(v)}
                  />
                  {v}
                </label>
              ))}
              {filteredUnique.length === 0 && (
                <p className="px-2 py-1 text-zinc-400">Nessun valore.</p>
              )}
            </div>
          </div>
        </>
      )}
    </th>
  );
}
