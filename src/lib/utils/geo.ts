// Geolocation utilities — coordinate types, distance calculation, bounds checking

export type Coordonnees = {
  latitude: number;
  longitude: number;
};

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export function haversineDistance(
  from: Coordonnees,
  to: Coordonnees
): { distanceKm: number; distanceLabel: string } {
  const earthRadiusKm = 6371;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.asin(Math.min(1, Math.sqrt(a)));
  const distanceKm = Math.round(earthRadiusKm * c * 100) / 100;
  const distanceLabel =
    distanceKm < 1
      ? `${Math.round(distanceKm * 1000)} m`
      : `${distanceKm.toFixed(1)} km`;

  return { distanceKm, distanceLabel };
}
