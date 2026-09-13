import { getClientIp } from "@/shared/http/client-ip";
import { NextRequest } from "next/server";
import { apiResponse } from "@/app/api/_shared/response";
import { validateBody } from "@/app/api/_shared/validate";
import { buildPaginationMeta } from "@/shared/pagination";
import { createLogger } from "@/infrastructure/logger";
import { checkRateLimit, geoSearchLimiter } from "@/infrastructure/rate-limit";
import { restaurantSearchSchema } from "@/modules/restaurants/contracts";
import { RestaurantMarketError } from "@/modules/restaurants/model";
import { searchRestaurantsInCurrentMarket } from "@/modules/discovery/server";

const log = createLogger("v1-public-restaurants-search");

/**
 * Recherche publique de restaurants (sans authentification).
 * Réutilise le moteur canonique `searchRestaurantsInCurrentMarket` : aucune
 * règle de visibilité ou de marché dupliquée. Retourne 200 avec une liste
 * vide quand aucun restaurant ne correspond (jamais 404), pour que les
 * clients distinguent « aucun résultat » d'une route inexistante.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limited = await checkRateLimit(geoSearchLimiter, ip);
  if (limited) return limited;

  const { data, error } = await validateBody(request, restaurantSearchSchema);
  if (error) return error;

  try {
    const result = await searchRestaurantsInCurrentMarket(data);
    return apiResponse.success(
      {
        items: result.items,
        market: result.market,
        capability: result.capability,
        policyMode: result.policyMode,
      },
      {
        meta: buildPaginationMeta(result.total, result.page, result.limit),
      },
    );
  } catch (err) {
    if (err instanceof RestaurantMarketError) {
      // Un marché non résolu reste une réponse de recherche valide (vide),
      // sauf position manquante qui reste une erreur de validation.
      if (err.code === "CURRENT_LOCATION_REQUIRED") {
        return apiResponse.error(err.message, err.code, { status: 422 });
      }
      log.info({ code: err.code }, "Recherche publique sans résultat (marché)");
      return apiResponse.success({ items: [], market: null, capability: null, policyMode: "off" });
    }
    log.error({ err }, "Erreur recherche publique restaurants");
    return apiResponse.internalError();
  }
}
