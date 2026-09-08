export const MODULE_KEYS = [
  "timbrature",
  "pianificazione",
  "presenze",
  "permessi",
  "preventivi",
  "consuntivi",
  "clienti",
  "fornitori",
  "collaboratori",
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
  fornitori: "Fornitori",
  collaboratori: "Collaboratori",
  statistiche: "Statistiche",
};

export const MODULE_GROUPS: { label: string; keys: ModuleKey[] }[] = [
  { label: "Anagrafiche", keys: ["clienti", "fornitori", "collaboratori"] },
  { label: "Gestione", keys: ["pianificazione", "preventivi", "consuntivi"] },
  { label: "Produzione", keys: ["timbrature", "presenze", "permessi"] },
  { label: "Utilità", keys: ["statistiche"] },
];

export const MODULE_HREFS: Record<ModuleKey, string> = {
  timbrature: "/admin/timbrature",
  pianificazione: "/admin/pianificazione",
  presenze: "/admin/presenze",
  permessi: "/admin/permessi",
  preventivi: "/admin/preventivi",
  consuntivi: "/admin/consuntivi",
  clienti: "/admin/clienti",
  fornitori: "/admin/fornitori",
  collaboratori: "/admin/collaboratori",
  statistiche: "/admin/statistiche",
};

export function isModuleKey(value: string): value is ModuleKey {
  return (MODULE_KEYS as readonly string[]).includes(value);
}
