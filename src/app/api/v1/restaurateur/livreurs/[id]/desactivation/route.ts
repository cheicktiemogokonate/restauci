import { NextRequest } from "next/server";
import { requireRestaurateurSession } from "@/lib/api/auth-mobile";
import { deliveryErrorResponse } from "@/lib/api/delivery-response";
import { apiResponse } from "@/lib/api/response";
import { createLogger } from "@/lib/logger";
import { checkRateLimit, mobileApiLimiter } from "@/lib/rate-limit";
import { deactivateRestaurantDriver } from "@/modules/deliveries/server";

const log = createLogger("v1-restaurant-driver-deactivate");

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { session, error } = await requireRestaurateurSession(request);
  if (error) return error;
  const limited = await checkRateLimit(mobileApiLimiter, session.userId);
  if (limited) return limited;
  try {
    return apiResponse.success(await deactivateRestaurantDriver(session, id));
  } catch (caught) {
    const response = deliveryErrorResponse(caught);
    if (response) return response;
    log.error({ err: caught, driverId: id }, "Désactivation livreur impossible");
    return apiResponse.internalError();
  }
}
