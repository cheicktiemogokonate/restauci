import { NextRequest }                    from "next/server";
import { requireRestaurateurSession }     from "@/app/api/_shared/auth-mobile";
import { apiResponse }                    from "@/app/api/_shared/response";
import { checkRateLimit, mobileApiLimiter } from "@/infrastructure/rate-limit";
import { getRestaurantDashboardStats }    from "@/modules/restaurants/server";
import { createLogger }                   from "@/infrastructure/logger";

const log = createLogger("v1-restaurateur-stats");

export async function GET(
  request: NextRequest
) {
  const { session, error } = await requireRestaurateurSession(request);
  if (error) return error;

  const rl = await checkRateLimit(mobileApiLimiter, session.userId);
  if (rl) return rl;

  try {
    const stats = await getRestaurantDashboardStats(session.restaurantId);
    return apiResponse.success(stats);
  } catch (err) {
    log.error({ err, restaurantId: session.restaurantId }, "Erreur stats");
    return apiResponse.internalError();
  }
}
