import { apiResponse } from "@/lib/api/response";
import { getRestaurantBySlug } from "@/lib/db/queries";
import { createLogger } from "@/lib/logger";
import { apiLimiter, checkRateLimit } from "@/lib/rate-limit";
import { NextRequest } from "next/server";

const log = createLogger("v1-public-restaurant");

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
    const restaurant = await getRestaurantBySlug(slug);
    if (!restaurant || !restaurant.actif) {
      return apiResponse.notFound("Restaurant");
    }

    // Ne pas exposer les champs sensibles
    const {
      userId, // Ne pas exposer
      ...safeData
    } = restaurant;
    void userId;

    return apiResponse.success(safeData);
  } catch (err) {
    log.error({ err, slug }, "Erreur page publique restaurant");
    return apiResponse.internalError();
  }
}
