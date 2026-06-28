import { apiResponse } from "@/lib/api/response";
import { validateSearchParams } from "@/lib/api/validate";
import { TTL, cacheKey, withCache } from "@/lib/cache";
import { db } from "@/lib/db";
import { commandes, restaurants } from "@/lib/db/schema";
import {
  calculerItineraire,
  calculerTempsAttente,
  distanceHaversine,
  estimerTempsTrajet,
} from "@/lib/geo";
import { createLogger } from "@/lib/logger";
import { checkRateLimit, clientApiLimiter } from "@/lib/rate-limit";
import { and, count, eq, inArray } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";

const log = createLogger("v1-client-restaurant-detail");

const querySchema = z.object({
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] ?? "anonymous";
  const rl = await checkRateLimit(clientApiLimiter, ip);
  if (rl) return rl;

  const { searchParams } = new URL(request.url);
  const { data: query, error } = validateSearchParams(
    searchParams,
    querySchema,
  );
  if (error) return error;

  try {
    // Restaurant de base (caché 1h)
    const restaurant = await withCache(
      cacheKey.restaurantPublic(slug),
      TTL.RESTAURANT_PUBLIC,
      async () => {
        const [r] = await db
          .select()
          .from(restaurants)
          .where(and(eq(restaurants.slug, slug), eq(restaurants.actif, true)))
          .limit(1);
        return r ?? null;
      },
    );

    if (!restaurant) return apiResponse.notFound("Restaurant");

    // Nombre de commandes en cours (temps réel — pas caché)
    const [{ commandesEnCours }] = await db
      .select({ commandesEnCours: count() })
      .from(commandes)
      .where(
        and(
          eq(commandes.restaurantId, restaurant.id),
          inArray(commandes.statut, ["recue", "en_preparation"]),
        ),
      );

    // Géolocalisation (si coordonnées client fournies)
    let distanceKm: number | null = null;
    let itineraire: Awaited<ReturnType<typeof calculerItineraire>> = null;
    let tempsAttente: ReturnType<typeof calculerTempsAttente> | null = null;

    if (query && query.lat !== undefined && query.lng !== undefined) {
      const userLocation = { lat: query.lat, lng: query.lng };
      const restoLocation = {
        lat: restaurant.latitude,
        lng: restaurant.longitude,
      };

      // Distance à vol d'oiseau (immédiat)
      distanceKm = distanceHaversine(userLocation, restoLocation);

      // Itinéraire OSRM (best-effort, timeout 5s)
      itineraire = await calculerItineraire(restoLocation, userLocation);

      // Temps d'attente avec trajet
      const trajetMinutes =
        itineraire?.dureeMinutes ?? estimerTempsTrajet(distanceKm);

      tempsAttente = calculerTempsAttente({
        tempsPreparationMoyen: restaurant.tempsPreparationMoyen ?? 20,
        commandesEnCours: Number(commandesEnCours),
        trajetMinutes,
      });
    } else {
      // Temps d'attente sans trajet (si pas de localisation)
      tempsAttente = calculerTempsAttente({
        tempsPreparationMoyen: restaurant.tempsPreparationMoyen ?? 20,
        commandesEnCours: Number(commandesEnCours),
      });
    }

    // Ne pas exposer userId
    const { userId, ...restaurantPublic } = restaurant;
    void userId;

    return apiResponse.success({
      ...restaurantPublic,
      // Infos géo (null si pas de coordonnées client)
      geo:
        distanceKm !== null
          ? {
              distanceKm,
              itineraire: itineraire
                ? {
                    distanceKm: itineraire.distanceKm,
                    dureeMinutes: itineraire.dureeMinutes,
                    // La géométrie est renvoyée pour que MapLibre trace la route
                    geometrie: itineraire.geometrie,
                  }
                : null,
            }
          : null,
      // Temps d'attente
      tempsAttente: {
        totalMinutes: tempsAttente.totalMinutes,
        label: formaterTempsAttente(tempsAttente.totalMinutes),
        detail: tempsAttente.detail,
      },
      // Charge actuelle
      commandesEnCours: Number(commandesEnCours),
    });
  } catch (err) {
    log.error({ err, slug: slug }, "Erreur détail restaurant client");
    return apiResponse.internalError();
  }
}

/**
 * Formate le temps d'attente en label lisible
 * @example formaterTempsAttente(44) → "~45 min"
 * @example formaterTempsAttente(90) → "~1h30"
 */
function formaterTempsAttente(minutes: number): string {
  // Arrondir à la tranche de 5 min la plus proche
  const arrondi = Math.ceil(minutes / 5) * 5;
  if (arrondi < 60) return `~${arrondi} min`;
  const h = Math.floor(arrondi / 60);
  const min = arrondi % 60;
  return min === 0 ? `~${h}h` : `~${h}h${min}`;
}
