import { NextRequest } from "next/server";
import { requireRestaurateurSession } from "@/app/api/_shared/auth-mobile";
import { deliveryErrorResponse } from "@/app/api/_shared/delivery-response";
import { apiResponse } from "@/app/api/_shared/response";
import { validateBody } from "@/app/api/_shared/validate";
import { createLogger } from "@/infrastructure/logger";
import { checkRateLimit, mobileApiLimiter } from "@/infrastructure/rate-limit";
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
