import { getClientIp } from "@/shared/http/client-ip";
import { apiResponse } from "@/app/api/_shared/response";
import { TTL, cacheKey, withCache } from "@/infrastructure/cache";
import { getPublicRestaurantBySlug } from "@/modules/restaurants/server";
import { getPublicRestaurantMenu } from "@/modules/menu/server";
import { createLogger } from "@/infrastructure/logger";
import { apiLimiter, checkRateLimit } from "@/infrastructure/rate-limit";
import { NextRequest } from "next/server";

const log = createLogger("v1-public-menu");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ip = getClientIp(request);
  const rl = await checkRateLimit(apiLimiter, ip);
  if (rl) return rl;

  try {
    // Le menu public est très cacheable (15 min)
    const menu = await withCache(
      cacheKey.restaurantPublicMenu(slug),
      TTL.PLATS,
      async () => {
        // Trouver le restaurant
        const restaurant = await getPublicRestaurantBySlug(slug);

        if (!restaurant) return null;

        return getPublicRestaurantMenu(restaurant.id);
      },
    );

    if (!menu) return apiResponse.notFound("Restaurant");

    return apiResponse.success(menu);
  } catch (err) {
    log.error({ err, slug }, "Erreur menu public");
    return apiResponse.internalError();
  }
}
