import { NextRequest } from "next/server";
import { requireDriverSession } from "@/lib/api/auth-driver";
import { deliveryErrorResponse } from "@/lib/api/delivery-response";
import { apiResponse } from "@/lib/api/response";
import { validateBody } from "@/lib/api/validate";
import { createLogger } from "@/lib/logger";
import { checkRateLimit, mobileApiLimiter } from "@/lib/rate-limit";
import { respondToDeliveryOfferSchema } from "@/modules/deliveries/contracts";
import { respondToDeliveryOffer } from "@/modules/deliveries/server";

const log = createLogger("v1-driver-offer-response");

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { session, error } = await requireDriverSession(request);
  if (error) return error;
  const limited = await checkRateLimit(mobileApiLimiter, session.driverId);
  if (limited) return limited;
  const validated = await validateBody(request, respondToDeliveryOfferSchema);
  if (validated.error) return validated.error;
  try {
    return apiResponse.success(
      await respondToDeliveryOffer(session, id, validated.data),
    );
  } catch (caught) {
    const response = deliveryErrorResponse(caught);
    if (response) return response;
    log.error({ err: caught, offerId: id }, "Réponse à la proposition impossible");
    return apiResponse.internalError();
  }
}
