import comuniByCap from "@/lib/data/comuniByCap.json";

const capMap = comuniByCap as unknown as Record<string, [string, string][]>;

export function lookupComuneFromCap(
  cap: string
): { comune: string | null; provincia: string | null } | null {
  const normalized = cap.trim();
  if (!/^\d{5}$/.test(normalized)) return null;

  const matches = capMap[normalized];
  if (!matches || matches.length === 0) return null;

  const province = new Set(matches.map(([, sigla]) => sigla));
  const provincia = province.size === 1 ? matches[0][1] : null;
  const comune = matches.length === 1 ? matches[0][0] : null;

  if (!comune && !provincia) return null;
  return { comune, provincia };
}
