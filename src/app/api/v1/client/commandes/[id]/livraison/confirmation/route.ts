import { NextRequest } from "next/server";
import { getClientSession } from "@/app/api/_shared/auth-client";
import { deliveryErrorResponse } from "@/app/api/_shared/delivery-response";
import { apiResponse } from "@/app/api/_shared/response";
import { createLogger } from "@/infrastructure/logger";
import { checkRateLimit, clientApiLimiter } from "@/infrastructure/rate-limit";
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
