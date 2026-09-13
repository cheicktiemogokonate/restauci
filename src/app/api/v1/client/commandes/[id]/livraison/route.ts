import { NextRequest } from "next/server";
import { getClientSession } from "@/app/api/_shared/auth-client";
import { apiResponse } from "@/app/api/_shared/response";
import { createLogger } from "@/infrastructure/logger";
import { checkRateLimit, clientApiLimiter } from "@/infrastructure/rate-limit";
import { getClientDelivery } from "@/modules/deliveries/server";

const log = createLogger("v1-client-delivery");

export async function GET(
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
    return delivery
      ? apiResponse.success(delivery)
      : apiResponse.notFound("Livraison");
  } catch (caught) {
    log.error({ err: caught, orderId: id }, "Lecture de livraison client impossible");
    return apiResponse.internalError();
  }
}
