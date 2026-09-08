// Confronto condiviso per l'ordinamento delle liste lato client: stringhe
// (localeCompare italiano, case-insensitive) o numeri, in un verso o l'altro.
export function compareValues(
  a: string | number,
  b: string | number,
  dir: "asc" | "desc" = "asc"
): number {
  const cmp =
    typeof a === "number" && typeof b === "number"
      ? a - b
      : String(a).localeCompare(String(b), "it", { sensitivity: "base" });
  return dir === "asc" ? cmp : -cmp;
}
