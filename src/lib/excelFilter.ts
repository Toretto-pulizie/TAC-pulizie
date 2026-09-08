// Valore mostrato nell'elenco dei filtri stile Excel: le celle vuote
// diventano "(Vuoto)", come fa Excel stesso nel menu di AutoFiltro.
export function displayValue(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "(Vuoto)";
  return String(v);
}

// Una riga passa il filtro se, per ogni colonna con un filtro attivo (un
// Set, non null/undefined), il suo valore visualizzato è tra quelli
// selezionati. Nessun filtro su una colonna = quella colonna non esclude
// nulla.
export function passesColumnFilters(
  row: Record<string, unknown>,
  filters: Record<string, Set<string> | null | undefined>
): boolean {
  for (const [key, set] of Object.entries(filters)) {
    if (!set) continue;
    const val = displayValue(row[key] as string | number | null | undefined);
    if (!set.has(val)) return false;
  }
  return true;
}
