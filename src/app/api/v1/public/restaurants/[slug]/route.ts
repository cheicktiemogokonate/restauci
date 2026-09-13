import { getClientIp } from "@/shared/http/client-ip";
import { apiResponse } from "@/app/api/_shared/response";
import { getPublicRestaurantBySlug } from "@/modules/restaurants/server";
import { createLogger } from "@/infrastructure/logger";
import { apiLimiter, checkRateLimit } from "@/infrastructure/rate-limit";
import { NextRequest } from "next/server";

const log = createLogger("v1-public-restaurant");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ip = getClientIp(request);
  const rl = await checkRateLimit(apiLimiter, ip);
  if (rl) return rl;

  try {
    const restaurant = await getPublicRestaurantBySlug(slug);
    if (!restaurant) {
      return apiResponse.notFound("Restaurant");
    }

    return apiResponse.success(restaurant);
  } catch (err) {
    log.error({ err, slug }, "Erreur page publique restaurant");
    return apiResponse.internalError();
  }
}
