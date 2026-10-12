export const MODULE_KEYS = [
  "timbrature",
  "pianificazione",
  "presenze",
  "permessi",
  "preventivi",
  "consuntivi",
  "clienti",
  "sedi",
  "fornitori",
  "collaboratori",
  "statistiche",
  "amministrazione",
  "sopralluoghi",
  "fatturazione",
  "commesse",
  "chiusure",
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export const MODULE_LABELS: Record<ModuleKey, string> = {
  timbrature: "Timbrature",
  pianificazione: "Pianificazione",
  presenze: "Presenze",
  permessi: "Permessi",
  preventivi: "Offerte",
  consuntivi: "Consuntivi",
  clienti: "Clienti",
  sedi: "Sedi",
  fornitori: "Fornitori",
  collaboratori: "Collaboratori",
  statistiche: "Statistiche",
  amministrazione: "Amministrazione",
  sopralluoghi: "Sopralluoghi",
  fatturazione: "Fatturazione",
  commesse: "Commesse",
  chiusure: "Chiusure",
};

export const MODULE_GROUPS: { label: string; keys: ModuleKey[] }[] = [
  { label: "Anagrafiche", keys: ["clienti", "sedi", "fornitori", "collaboratori"] },
  { label: "Gestione", keys: ["commesse", "chiusure", "pianificazione", "preventivi", "consuntivi", "sopralluoghi"] },
  { label: "Produzione", keys: ["timbrature", "presenze", "permessi"] },
  { label: "Contabilità", keys: ["fatturazione"] },
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
  sedi: "/admin/sedi",
  fornitori: "/admin/fornitori",
  collaboratori: "/admin/collaboratori",
  statistiche: "/admin/statistiche",
  sopralluoghi: "/admin/sopralluoghi",
  fatturazione: "/admin/fatturazione",
  commesse: "/admin/commesse",
  chiusure: "/admin/chiusure",
  // Non fa parte di MODULE_GROUPS (niente sidebar admin / sezione Gestione
  // dipendente): è l'hub interno a /dipendente per chi ha questo permesso.
  amministrazione: "/dipendente/amministrazione",
};

export function isModuleKey(value: string): value is ModuleKey {
  return (MODULE_KEYS as readonly string[]).includes(value);
}
