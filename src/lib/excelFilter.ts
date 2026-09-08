// Valore mostrato/confrontato per una colonna: le celle vuote diventano
// "(Vuoto)", come fa Excel stesso nel menu di AutoFiltro.
export function displayValue(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "(Vuoto)";
  return String(v);
}

// Una riga passa il filtro se, per ogni colonna con una ricerca attiva
// (stringa non vuota), il suo valore visualizzato la contiene (senza
// distinguere maiuscole/minuscole). Nessuna ricerca su una colonna = quella
// colonna non esclude nulla.
export function passesColumnFilters(
  row: Record<string, unknown>,
  filters: Record<string, string | null | undefined>
): boolean {
  for (const [key, query] of Object.entries(filters)) {
    if (!query) continue;
    const val = displayValue(row[key] as string | number | null | undefined);
    if (!val.toLowerCase().includes(query.toLowerCase())) return false;
  }
  return true;
}
