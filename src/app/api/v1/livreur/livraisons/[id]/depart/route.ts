import { NextRequest } from "next/server";
import { requireDriverSession } from "@/lib/api/auth-driver";
import { deliveryErrorResponse } from "@/lib/api/delivery-response";
import { apiResponse } from "@/lib/api/response";
import { createLogger } from "@/lib/logger";
import { checkRateLimit, mobileApiLimiter } from "@/lib/rate-limit";
import { startDriverDelivery } from "@/modules/deliveries/server";

const log = createLogger("v1-driver-delivery-start");

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { session, error } = await requireDriverSession(request);
  if (error) return error;
  const limited = await checkRateLimit(mobileApiLimiter, session.driverId);
  if (limited) return limited;
  try {
    return apiResponse.success(
      await startDriverDelivery(session, { deliveryId: id }),
    );
  } catch (caught) {
    const response = deliveryErrorResponse(caught);
    if (response) return response;
    log.error({ err: caught, deliveryId: id }, "Départ de livraison impossible");
    return apiResponse.internalError();
  }
}
