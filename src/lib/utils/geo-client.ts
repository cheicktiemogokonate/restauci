const OSRM_BASE_URL = "https://router.project-osrm.org";

// Constante dupliquée depuis src/lib/geo/index.ts (GEO_TIMEOUT_MS = 5000).
// Non importée car ce module est client ("use client" via delivery-map.tsx)
// et geo/index.ts importe @/lib/logger (pino + @/lib/env) — un import
// entraînerait pino et la config env dans le bundle navigateur.
// Les deux valeurs doivent rester synchronisées : 5000 ms.
const GEO_TIMEOUT_MS = 5000;

export async function fetchOsrmRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): Promise<{
  distanceKm: number;
  dureeMinutes: number;
  geometrie: [number, number][];
} | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEO_TIMEOUT_MS);
  try {
    const url =
      `${OSRM_BASE_URL}/route/v1/driving/` +
      `${fromLng},${fromLat};${toLng},${toLat}` +
      `?overview=full&geometries=geojson&steps=false`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Toutci/1.0" },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      code: string;
      routes: Array<{
        distance: number;
        duration: number;
        geometry: { coordinates: number[][] };
      }>;
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
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function geocodeAddress(
  address: string,
): Promise<{ latitude: number; longitude: number } | null> {
  const query = address.trim();
  if (!query) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEO_TIMEOUT_MS);

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("addressdetails", "1");

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Toutci/1.0",
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!res.ok) return null;

    const data = (await res.json()) as Array<{
      lat?: string;
      lon?: string;
    }>;

    const first = data[0];
    if (!first?.lat || !first?.lon) return null;

    return {
      latitude: Number.parseFloat(first.lat),
      longitude: Number.parseFloat(first.lon),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
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
  return (
    Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10
  );
}
