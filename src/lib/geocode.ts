export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "TAC-pulizie-app (enrico@carrozzeriapoliziano.it)",
      },
    });
    if (!res.ok) return null;

    const results = (await res.json()) as { lat: string; lon: string }[];
    const first = results[0];
    if (!first) return null;

    return { lat: parseFloat(first.lat), lng: parseFloat(first.lon) };
  } catch {
    return null;
  }
}
