import { getClientIp } from "@/shared/http/client-ip";
import { NextRequest } from "next/server";
import { apiResponse } from "@/app/api/_shared/response";
import { validateBody } from "@/app/api/_shared/validate";
import { buildPaginationMeta } from "@/shared/pagination";
import { createLogger } from "@/infrastructure/logger";
import {
  checkRateLimit,
  geoSearchLimiter,
} from "@/infrastructure/rate-limit";
import { restaurantSearchSchema } from "@/modules/restaurants/contracts";
import { RestaurantMarketError } from "@/modules/restaurants/model";
import { searchRestaurantsInCurrentMarket } from "@/modules/discovery/server";
import { restaurantMarketErrorResponse } from "../http";

const log = createLogger("v1-client-restaurants-search");

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
  } catch (error) {
    if (error instanceof RestaurantMarketError) {
      return restaurantMarketErrorResponse(error);
    }
    log.error({ error }, "Erreur recherche Restaurants par marché");
    return apiResponse.internalError();
  }
}
