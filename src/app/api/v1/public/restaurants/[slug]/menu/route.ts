import { apiResponse } from "@/lib/api/response";
import { TTL, cacheKey, withCache } from "@/lib/cache";
import { getRestaurantBySlug } from "@/lib/db/queries";
import { getPublicRestaurantMenu } from "@/lib/quota-entitlements";
import { createLogger } from "@/lib/logger";
import { apiLimiter, checkRateLimit } from "@/lib/rate-limit";
import { NextRequest } from "next/server";

const log = createLogger("v1-public-menu");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] ?? "anonymous";
  const rl = await checkRateLimit(apiLimiter, ip);
  if (rl) return rl;

  try {
    // Le menu public est très cacheable (15 min)
    const menu = await withCache(
      cacheKey.restaurantPublicMenu(slug),
      TTL.PLATS,
      async () => {
        // Trouver le restaurant
        const restaurant = await getRestaurantBySlug(slug);

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
