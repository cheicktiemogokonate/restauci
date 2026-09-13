import { getClientIp } from "@/shared/http/client-ip";
import { apiResponse } from "@/app/api/_shared/response";
import { validateSearchParams } from "@/app/api/_shared/validate";
import {
  calculerItineraire,
  calculerTempsAttente,
  distanceHaversine,
  estimerTempsTrajet,
} from "@/infrastructure/geocoding";
import { createLogger } from "@/infrastructure/logger";
import { checkRateLimit, clientApiLimiter } from "@/infrastructure/rate-limit";
import { NextRequest } from "next/server";
import { z } from "zod";
import { env } from "@/infrastructure/env";
import {
  getServiceMarketCapability,
  resolveServiceMarketAtCoordinates,
} from "@/modules/service-markets/server";
import { evaluateRestaurantOrderability } from "@/modules/restaurants/model";
import {
  getPublicRestaurantBySlug,
  getRestaurantOrderCandidateBySlug,
  getRestaurantOrderContext,
} from "@/modules/restaurants/server";
import { getRestaurantActiveOrderCount } from "@/modules/orders/server";

const log = createLogger("v1-client-restaurant-detail");

const querySchema = z
  .object({
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
  })
  .refine(
    (value) =>
      (value.lat === undefined && value.lng === undefined) ||
      (value.lat !== undefined && value.lng !== undefined),
    { message: "Latitude et longitude doivent être fournies ensemble." },
  );

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ip = getClientIp(request);
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
    const [restaurant, candidate] = await Promise.all([
      getPublicRestaurantBySlug(slug),
      getRestaurantOrderCandidateBySlug(slug),
    ]);
    if (!restaurant || !candidate) return apiResponse.notFound("Restaurant");
    const orderContext = await getRestaurantOrderContext(candidate.id);
    if (!orderContext) return apiResponse.notFound("Restaurant");

    let sameServiceMarket: boolean | null = null;
    if (query?.lat !== undefined && query.lng !== undefined) {
      const resolution = await resolveServiceMarketAtCoordinates({
        lat: query.lat,
        lng: query.lng,
      });
      sameServiceMarket =
        resolution.status === "resolved" && orderContext.serviceMarketId !== null
          ? resolution.market.id === orderContext.serviceMarketId
          : false;
    }
    const capability = orderContext.serviceMarketId
      ? await getServiceMarketCapability(
          orderContext.serviceMarketId,
          "restaurant",
        )
      : null;
    const orderability = evaluateRestaurantOrderability({
      restaurant: orderContext,
      policyMode: env.RESTAURANT_GEO_POLICY_MODE,
      hasMarketAssignment: Boolean(
        orderContext.serviceMarketId && orderContext.serviceMarketVersionId,
      ),
      sameServiceMarket,
      restaurantCapabilityActive: capability?.status === "active",
    });

    // Nombre de commandes en cours (temps réel — pas caché)
    const commandesEnCours = await getRestaurantActiveOrderCount(restaurant.id);

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

    return apiResponse.success({
      ...restaurant,
      sameServiceMarket,
      orderable: orderability.orderable,
      orderabilityReason: orderability.reason,
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
