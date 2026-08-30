import { NextRequest } from "next/server";
import { requireRestaurateurSession } from "@/lib/api/auth-mobile";
import { deliveryErrorResponse } from "@/lib/api/delivery-response";
import { apiResponse } from "@/lib/api/response";
import { validateBody } from "@/lib/api/validate";
import { createLogger } from "@/lib/logger";
import { checkRateLimit, mobileApiLimiter } from "@/lib/rate-limit";
import { confirmDriverCompensationPaymentSchema } from "@/modules/deliveries/contracts";
import { confirmDriverCompensationPayment } from "@/modules/deliveries/server";

const log = createLogger("v1-restaurant-driver-compensations");
const compensationPaymentBodySchema =
  confirmDriverCompensationPaymentSchema.omit({ driverId: true });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { session, error } = await requireRestaurateurSession(request);
  if (error) return error;
  const limited = await checkRateLimit(mobileApiLimiter, session.userId);
  if (limited) return limited;
  const validated = await validateBody(
    request,
    compensationPaymentBodySchema,
  );
  if (validated.error) return validated.error;
  try {
    return apiResponse.success(
      await confirmDriverCompensationPayment(session, {
        driverId: id,
        ...validated.data,
      }),
    );
  } catch (caught) {
    const response = deliveryErrorResponse(caught);
    if (response) return response;
    log.error(
      { err: caught, driverId: id },
      "Déclaration de rémunération impossible",
    );
    return apiResponse.internalError();
  }
}
