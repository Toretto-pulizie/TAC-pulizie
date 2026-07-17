export type ViesResult = {
  ragioneSociale: string;
  indirizzo: string;
  cap: string;
  citta: string;
  provincia: string;
};

function parseAddress(address: string): Omit<ViesResult, "ragioneSociale"> | null {
  const lines = address
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return null;

  const indirizzo = lines[0];
  const match = lines[1].match(/^(\d{5})\s+(.+)\s+([A-Z]{2})$/);
  if (!match) return null;

  const [, cap, citta, provincia] = match;
  return { indirizzo, cap, citta, provincia };
}

export async function lookupPartitaIva(piva: string): Promise<ViesResult | null> {
  const cleaned = piva.trim();
  if (!/^\d{11}$/.test(cleaned)) return null;

  const res = await fetch(
    `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/IT/vat/${cleaned}`,
    { headers: { Accept: "application/json" } }
  );
  if (!res.ok) return null;

  const data = await res.json();
  if (!data.isValid || !data.name || !data.address) return null;

  const parsedAddress = parseAddress(data.address);
  if (!parsedAddress) return null;

  return { ragioneSociale: data.name.trim(), ...parsedAddress };
}
