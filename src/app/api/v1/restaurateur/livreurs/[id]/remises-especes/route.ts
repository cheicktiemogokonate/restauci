import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRestaurateurSession } from "@/app/api/_shared/auth-mobile";
import { deliveryErrorResponse } from "@/app/api/_shared/delivery-response";
import { apiResponse } from "@/app/api/_shared/response";
import { validateBody } from "@/app/api/_shared/validate";
import { createLogger } from "@/infrastructure/logger";
import { checkRateLimit, mobileApiLimiter } from "@/infrastructure/rate-limit";
import { confirmDriverCashRemittance } from "@/modules/deliveries/server";

const log = createLogger("v1-driver-cash-remittance");
const schema = z
  .object({
    deliveryIds: z.array(z.string().uuid()).min(1).max(200),
    note: z.string().trim().max(500).optional(),
  })
  .strict();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { session, error } = await requireRestaurateurSession(request);
  if (error) return error;
  const limited = await checkRateLimit(mobileApiLimiter, session.userId);
  if (limited) return limited;
  const validated = await validateBody(request, schema);
  if (validated.error) return validated.error;
  try {
    return apiResponse.created(
      await confirmDriverCashRemittance(session, {
        driverId: id,
        ...validated.data,
      }),
    );
  } catch (caught) {
    const response = deliveryErrorResponse(caught);
    if (response) return response;
    log.error({ err: caught, driverId: id }, "Remise d'espèces impossible");
    return apiResponse.internalError();
  }
}
