import { NextRequest } from "next/server";
import { requireDriverSession } from "@/app/api/_shared/auth-driver";
import { deliveryErrorResponse } from "@/app/api/_shared/delivery-response";
import { apiResponse } from "@/app/api/_shared/response";
import { validateBody } from "@/app/api/_shared/validate";
import { createLogger } from "@/infrastructure/logger";
import { checkRateLimit, mobileApiLimiter } from "@/infrastructure/rate-limit";
import { setDriverAvailabilitySchema } from "@/modules/deliveries/contracts";
import { setDriverAvailability } from "@/modules/deliveries/server";

const log = createLogger("v1-driver-availability");

export async function PATCH(request: NextRequest) {
  const { session, error } = await requireDriverSession(request);
  if (error) return error;
  const limited = await checkRateLimit(mobileApiLimiter, session.driverId);
  if (limited) return limited;
  const validated = await validateBody(request, setDriverAvailabilitySchema);
  if (validated.error) return validated.error;
  try {
    return apiResponse.success(
      await setDriverAvailability(session, validated.data),
    );
  } catch (caught) {
    const response = deliveryErrorResponse(caught);
    if (response) return response;
    log.error({ err: caught }, "Disponibilité livreur impossible à modifier");
    return apiResponse.internalError();
  }
}
