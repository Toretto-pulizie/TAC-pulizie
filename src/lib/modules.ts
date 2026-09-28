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
  "amministrazione",
  "sopralluoghi",
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
  amministrazione: "Amministrazione",
  sopralluoghi: "Sopralluoghi",
};

export const MODULE_GROUPS: { label: string; keys: ModuleKey[] }[] = [
  { label: "Anagrafiche", keys: ["clienti", "fornitori", "collaboratori"] },
  { label: "Gestione", keys: ["pianificazione", "preventivi", "consuntivi", "sopralluoghi"] },
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
  sopralluoghi: "/admin/sopralluoghi",
  // Non fa parte di MODULE_GROUPS (niente sidebar admin / sezione Gestione
  // dipendente): è l'hub interno a /dipendente per chi ha questo permesso.
  amministrazione: "/dipendente/amministrazione",
};

export function isModuleKey(value: string): value is ModuleKey {
  return (MODULE_KEYS as readonly string[]).includes(value);
}
