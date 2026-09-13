import { NextRequest } from "next/server";
import { requireRestaurateurSession } from "@/app/api/_shared/auth-mobile";
import { deliveryErrorResponse } from "@/app/api/_shared/delivery-response";
import { apiResponse } from "@/app/api/_shared/response";
import { createLogger } from "@/infrastructure/logger";
import { checkRateLimit, mobileApiLimiter } from "@/infrastructure/rate-limit";
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
