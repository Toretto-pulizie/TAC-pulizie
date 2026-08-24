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
  { label: "Dipendenti", keys: ["timbrature", "pianificazione", "presenze", "permessi"] },
  { label: "Clienti", keys: ["preventivi", "consuntivi", "clienti", "statistiche"] },
];

export const MODULE_HREFS: Record<ModuleKey, string> = {
  timbrature: "/admin",
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
