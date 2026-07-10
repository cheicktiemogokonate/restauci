const OSRM_BASE_URL = "https://router.project-osrm.org";

export async function fetchOsrmRoute(
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number,
): Promise<{ distanceKm: number; dureeMinutes: number; geometrie: [number, number][] } | null> {
  try {
    const url =
      `${OSRM_BASE_URL}/route/v1/driving/` +
      `${fromLng},${fromLat};${toLng},${toLat}` +
      `?overview=full&geometries=geojson&steps=false`;
    const res = await fetch(url, { headers: { "User-Agent": "RestauCI/1.0" } });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      code: string;
      routes: Array<{ distance: number; duration: number; geometry: { coordinates: number[][] } }>;
    };
    if (data.code !== "Ok" || !data.routes[0]) return null;
    const route = data.routes[0];
    return {
      distanceKm: Math.round(route.distance / 100) / 10,
      dureeMinutes: Math.ceil(route.duration / 60),
      geometrie: route.geometry.coordinates as [number, number][],
    };
  } catch {
    return null;
  }
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}