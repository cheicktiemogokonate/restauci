import { NextRequest } from "next/server";
import { requireDriverSession } from "@/app/api/_shared/auth-driver";
import { deliveryErrorResponse } from "@/app/api/_shared/delivery-response";
import { apiResponse } from "@/app/api/_shared/response";
import { createLogger } from "@/infrastructure/logger";
import { checkRateLimit, mobileApiLimiter } from "@/infrastructure/rate-limit";
import { getDriverDelivery } from "@/modules/deliveries/server";

const log = createLogger("v1-driver-delivery");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { session, error } = await requireDriverSession(request);
  if (error) return error;
  const limited = await checkRateLimit(mobileApiLimiter, session.driverId);
  if (limited) return limited;
  try {
    return apiResponse.success(await getDriverDelivery(session, id));
  } catch (caught) {
    const response = deliveryErrorResponse(caught);
    if (response) return response;
    log.error({ err: caught, deliveryId: id }, "Lecture de livraison impossible");
    return apiResponse.internalError();
  }
}
