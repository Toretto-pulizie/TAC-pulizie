export const MODULE_KEYS = [
  "timbrature",
  "pianificazione",
  "presenze",
  "permessi",
  "preventivi",
  "consuntivi",
  "clienti",
  "statistiche",
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export const MODULE_LABELS: Record<ModuleKey, string> = {
  timbrature: "Timbrature",
  pianificazione: "Pianificazione",
  presenze: "Presenze",
  permessi: "Permessi",
  preventivi: "Preventivi",
  consuntivi: "Consuntivi",
  clienti: "Clienti",
  statistiche: "Statistiche",
};

export const MODULE_GROUPS: { label: string; keys: ModuleKey[] }[] = [
  { label: "Clienti", keys: ["pianificazione", "preventivi", "consuntivi", "clienti"] },
  { label: "Collaboratori", keys: ["timbrature", "presenze", "permessi"] },
];

// Not part of either group visually — shown in the sidebar's bottom section,
// near Utenti/Impostazioni, instead of inside the two grouped clusters.
export const STANDALONE_MODULE_KEYS: ModuleKey[] = ["statistiche"];

export const MODULE_HREFS: Record<ModuleKey, string> = {
  timbrature: "/admin/timbrature",
  pianificazione: "/admin/pianificazione",
  presenze: "/admin/presenze",
  permessi: "/admin/permessi",
  preventivi: "/admin/preventivi",
  consuntivi: "/admin/consuntivi",
  clienti: "/admin/clienti",
  statistiche: "/admin/statistiche",
};

export function isModuleKey(value: string): value is ModuleKey {
  return (MODULE_KEYS as readonly string[]).includes(value);
}
