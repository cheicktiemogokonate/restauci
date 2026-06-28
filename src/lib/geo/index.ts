import { createLogger } from "@/lib/logger";

const log = createLogger("geo");

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface Coordonnees {
  lat: number;
  lng: number;
}

export interface ResultatItineraire {
  distanceKm:    number;   // distance routière en km
  dureeMinutes:  number;   // durée estimée en minutes
  geometrie?:    number[][];  // liste de [lng, lat] pour tracer la route
}

export interface ResultatGeocodage {
  adresse:    string;
  lat:        number;
  lng:        number;
  ville?:     string;
  pays?:      string;
}

// ─── CONSTANTES ──────────────────────────────────────────────────────────────

// Instance publique OSRM (gratuite, sans clé)
// ⚠️ Utiliser l'instance publique pour démarrer, migrer vers auto-hébergé ensuite
const OSRM_BASE_URL = "https://router.project-osrm.org";

// Instance publique Photon (geocoding open source basé sur OpenStreetMap)
const PHOTON_BASE_URL = "https://photon.komoot.io";

// Timeout pour les appels aux APIs externes
const GEO_TIMEOUT_MS = 5000;

// ─── CALCUL DISTANCE À VOL D'OISEAU (Haversine) ──────────────────────────────

/**
 * Calcule la distance à vol d'oiseau entre deux points GPS.
 * Formule Haversine — précision ~0.5%
 *
 * @returns Distance en kilomètres
 */
export function distanceHaversine(
  point1: Coordonnees,
  point2: Coordonnees
): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = toRad(point2.lat - point1.lat);
  const dLng = toRad(point2.lng - point1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.lat)) *
      Math.cos(toRad(point2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // Arrondi à 0.1 km
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// ─── OSRM : DISTANCE ROUTIÈRE ET ITINÉRAIRE ──────────────────────────────────

/**
 * Calcule l'itinéraire routier entre deux points via OSRM.
 * Retourne null si l'API est indisponible (best-effort).
 *
 * @param depart  - Coordonnées du point de départ (restaurant)
 * @param arrivee - Coordonnées du point d'arrivée (client)
 */
export async function calculerItineraire(
  depart:  Coordonnees,
  arrivee: Coordonnees
): Promise<ResultatItineraire | null> {
  try {
    const url =
      `${OSRM_BASE_URL}/route/v1/driving/` +
      `${depart.lng},${depart.lat};${arrivee.lng},${arrivee.lat}` +
      `?overview=simplified&geometries=geojson&steps=false`;

    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), GEO_TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "RestauCI/1.0 (contact@restauci.ci)" },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      log.warn({ status: response.status }, "OSRM returned non-200");
      return null;
    }

    const data = await response.json() as {
      code:   string;
      routes: Array<{
        distance: number;  // mètres
        duration: number;  // secondes
        geometry: { coordinates: number[][] };
      }>;
    };

    if (data.code !== "Ok" || !data.routes[0]) return null;

    const route = data.routes[0];

    return {
      distanceKm:   Math.round(route.distance / 100) / 10, // mètres → km (1 déc.)
      dureeMinutes: Math.ceil(route.duration / 60),         // secondes → minutes
      geometrie:    route.geometry.coordinates,             // [[lng, lat], ...]
    };
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      log.warn("OSRM timeout après 5s");
    } else {
      log.error({ err }, "Erreur OSRM");
    }
    return null;
  }
}

// ─── PHOTON : GEOCODAGE (adresse → GPS) ──────────────────────────────────────

/**
 * Transforme une adresse textuelle en coordonnées GPS via Photon.
 * Retourne null si l'API est indisponible.
 *
 * @param adresse - Ex: "Cocody Riviera 3, Abidjan"
 * @param lang    - Langue des résultats (défaut: "fr")
 */
export async function geocoder(
  adresse: string,
  lang = "fr"
): Promise<ResultatGeocodage | null> {
  try {
    const params = new URLSearchParams({
      q:    adresse,
      lang,
      limit: "1",
      // Biais vers la Côte d'Ivoire (Abidjan)
      "bbox": "-8.601,4.273,-2.493,10.74",
    });

    const url = `${PHOTON_BASE_URL}/api/?${params}`;

    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), GEO_TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "RestauCI/1.0 (contact@restauci.ci)" },
    });
    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const data = await response.json() as {
      features: Array<{
        geometry:   { coordinates: [number, number] };
        properties: {
          name?:    string;
          city?:    string;
          country?: string;
          street?:  string;
          housenumber?: string;
        };
      }>;
    };

    const feature = data.features[0];
    if (!feature) return null;

    const [lng, lat] = feature.geometry.coordinates;
    const props      = feature.properties;

    return {
      adresse: [props.housenumber, props.street, props.name]
        .filter(Boolean)
        .join(" ") || adresse,
      lat,
      lng,
      ville: props.city,
      pays:  props.country,
    };
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      log.warn("Photon timeout après 5s");
    } else {
      log.error({ err }, "Erreur Photon geocoding");
    }
    return null;
  }
}

// ─── CALCUL TEMPS D'ATTENTE DYNAMIQUE ────────────────────────────────────────

/**
 * Calcule le temps d'attente estimé pour un restaurant.
 *
 * Formule :
 *   tempsAttente = tempsPreparationMoyen
 *                + (commandesEnCours × 3 min)
 *                + tempsTrajet (OSRM si dispo, sinon estimation vol d'oiseau)
 *
 * @param tempsPreparationMoyen - En minutes (depuis la table restaurants)
 * @param commandesEnCours      - Nombre de commandes recue + en_preparation
 * @param trajetMinutes         - Temps de trajet en minutes (optionnel)
 */
export function calculerTempsAttente({
  tempsPreparationMoyen,
  commandesEnCours,
  trajetMinutes = 0,
}: {
  tempsPreparationMoyen: number;
  commandesEnCours:      number;
  trajetMinutes?:        number;
}): {
  totalMinutes: number;
  detail: {
    preparation: number;
    chargeActuelle: number;
    trajet: number;
  };
} {
  const preparation    = tempsPreparationMoyen;
  const chargeActuelle = commandesEnCours * 3; // 3 min par commande en cours
  const trajet         = trajetMinutes;
  const totalMinutes   = preparation + chargeActuelle + trajet;

  return {
    totalMinutes,
    detail: { preparation, chargeActuelle, trajet },
  };
}

/**
 * Estime le temps de trajet depuis la distance à vol d'oiseau.
 * Utilisé en fallback si OSRM est indisponible.
 * Vitesse moyenne moto Abidjan : ~25 km/h (trafic urbain)
 */
export function estimerTempsTrajet(distanceKm: number): number {
  const vitesseMoyenneKmh = 25;
  return Math.ceil((distanceKm / vitesseMoyenneKmh) * 60);
}

// ─── TRI DES RESTAURANTS PAR PROXIMITÉ ───────────────────────────────────────

/**
 * Trie une liste de restaurants par distance croissante
 * depuis un point GPS donné.
 */
export function trierParProximite<T extends {
  latitude:  number;
  longitude: number;
}>(
  restaurants: T[],
  userLocation: Coordonnees
): (T & { distanceKm: number })[] {
  return restaurants
    .map((r) => ({
      ...r,
      distanceKm: distanceHaversine(
        userLocation,
        { lat: r.latitude, lng: r.longitude }
      ),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}