import { NextRequest } from "next/server";
import { getClientSession } from "@/lib/api/auth-client";
import { deliveryErrorResponse } from "@/lib/api/delivery-response";
import { apiResponse } from "@/lib/api/response";
import { createLogger } from "@/lib/logger";
import { checkRateLimit, clientApiLimiter } from "@/lib/rate-limit";
import {
  confirmClientDelivery,
  getClientDelivery,
} from "@/modules/deliveries/server";

const log = createLogger("v1-client-delivery-confirmation");

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { session, error } = await getClientSession(request);
  if (error) return error;
  const limited = await checkRateLimit(clientApiLimiter, session.clientId);
  if (limited) return limited;
  try {
    const delivery = await getClientDelivery(session.clientId, id);
    if (!delivery) return apiResponse.notFound("Livraison");
    return apiResponse.success(
      await confirmClientDelivery(session.clientId, {
        deliveryId: delivery.id,
      }),
    );
  } catch (caught) {
    const response = deliveryErrorResponse(caught);
    if (response) return response;
    log.error({ err: caught, orderId: id }, "Confirmation client impossible");
    return apiResponse.internalError();
  }
}
