// Un cliente Persona fisica va sempre mostrato e ordinato come "Cognome
// Nome" (es. "Volpe Alessia"), indipendentemente da come il campo `name` è
// stato salvato in origine (alcuni record più vecchi lo hanno in ordine
// inverso). Per Azienda/Ente/Associazione si usa la Ragione sociale, o il
// nome come ripiego.
export type ClientNameFields = {
  tipo: string;
  nome: string | null;
  cognome: string | null;
  ragioneSociale: string | null;
  name: string;
};

export function clientDisplayName(client: ClientNameFields): string {
  if (client.tipo === "PERSONA_FISICA") {
    return `${client.cognome ?? ""} ${client.nome ?? ""}`.trim();
  }
  return client.ragioneSociale ?? client.name;
}

export function sortByClientName<T>(
  items: T[],
  getClient: (item: T) => ClientNameFields
): T[] {
  return [...items].sort((a, b) =>
    clientDisplayName(getClient(a)).localeCompare(clientDisplayName(getClient(b)), "it")
  );
}
