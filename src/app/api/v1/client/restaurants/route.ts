import { NextRequest } from "next/server";
import { z } from "zod";
import { apiResponse } from "@/lib/api/response";
import { validateSearchParams } from "@/lib/api/validate";
import {
  buildPaginationMeta,
  parseLimit,
  parsePage,
} from "@/lib/config/pagination";
import { createLogger } from "@/lib/logger";
import {
  checkRateLimit,
  clientApiLimiter,
  geoSearchLimiter,
} from "@/lib/rate-limit";
import { RestaurantMarketError } from "@/modules/restaurants/model";
import { searchRestaurantsInCurrentMarket } from "@/modules/restaurants/server";
import { restaurantMarketErrorResponse } from "./http";

const log = createLogger("v1-client-restaurants-compat");

const querySchema = z
  .object({
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    accuracyMeters: z.coerce.number().min(0).max(100_000).default(1_000),
    capturedAt: z.string().datetime({ offset: true }).optional(),
    rayon: z.coerce.number().min(0.5).max(50).default(10),
    search: z.string().max(100).optional(),
    cuisine: z.string().max(100).optional(),
    modeCommande: z.enum(["sur_place", "livraison", "emporter"]).optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  })
  .refine(
    (value) =>
      (value.lat === undefined && value.lng === undefined) ||
      (value.lat !== undefined && value.lng !== undefined),
    { message: "Latitude et longitude doivent être fournies ensemble." },
  );

/**
 * Adaptateur de compatibilité. Les nouveaux clients utilisent POST /search afin
 * de ne pas exposer la position dans l'URL.
 */
export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "anonymous";
  const { searchParams } = new URL(request.url);
  const limiter = searchParams.has("lat") && searchParams.has("lng")
    ? geoSearchLimiter
    : clientApiLimiter;
  const limited = await checkRateLimit(limiter, ip);
  if (limited) return limited;

  const { data, error } = validateSearchParams(searchParams, querySchema);
  if (error) return error;
  if (data.lat === undefined || data.lng === undefined) {
    return apiResponse.error(
      "Votre position actuelle est nécessaire pour afficher les restaurants.",
      "CURRENT_LOCATION_REQUIRED",
      { status: 422 },
    );
  }
  const page = parsePage(data.page);
  const limit = parseLimit(data.limit, 20);
  try {
    const result = await searchRestaurantsInCurrentMarket({
      currentLocation: {
        lat: data.lat,
        lng: data.lng,
        accuracyMeters: data.accuracyMeters,
        capturedAt: data.capturedAt ?? new Date().toISOString(),
      },
      search: data.search,
      cuisine: data.cuisine,
      modeCommande: data.modeCommande,
      page,
      limit,
      legacyRadiusKm: data.rayon,
    });
    return apiResponse.success(result.items, {
      meta: buildPaginationMeta(result.total, page, limit),
    });
  } catch (error) {
    if (error instanceof RestaurantMarketError) {
      return restaurantMarketErrorResponse(error);
    }
    log.error({ error }, "Erreur liste Restaurants compatible");
    return apiResponse.internalError();
  }
}
