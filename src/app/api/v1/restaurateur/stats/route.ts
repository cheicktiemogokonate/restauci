import { NextRequest }                    from "next/server";
import { requireRestaurateurSession }     from "@/lib/api/auth-mobile";
import { apiResponse }                    from "@/lib/api/response";
import { checkRateLimit, mobileApiLimiter } from "@/lib/rate-limit";
import { getStatsDashboard }              from "@/lib/db/queries";
import { createLogger }                   from "@/lib/logger";

const log = createLogger("v1-restaurateur-stats");

export async function GET(
  request: NextRequest
) {
  const { session, error } = await requireRestaurateurSession(request);
  if (error) return error;

  const rl = await checkRateLimit(mobileApiLimiter, session.userId);
  if (rl) return rl;

  try {
    const stats = await getStatsDashboard(session.restaurantId);
    return apiResponse.success(stats);
  } catch (err) {
    log.error({ err, restaurantId: session.restaurantId }, "Erreur stats");
    return apiResponse.internalError();
  }
}