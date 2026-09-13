import { NextRequest } from "next/server";
import { z } from "zod";
import { requireDriverSession } from "@/app/api/_shared/auth-driver";
import { deliveryErrorResponse } from "@/app/api/_shared/delivery-response";
import { apiResponse } from "@/app/api/_shared/response";
import { validateBody } from "@/app/api/_shared/validate";
import { createLogger } from "@/infrastructure/logger";
import { checkRateLimit, mobileApiLimiter } from "@/infrastructure/rate-limit";
import { completeDriverDelivery } from "@/modules/deliveries/server";

const log = createLogger("v1-driver-delivery-complete");
const schema = z
  .object({
    proofCode: z.string().regex(/^\d{6}$/).optional(),
    cashCollected: z.boolean().default(false),
  })
  .strict();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { session, error } = await requireDriverSession(request);
  if (error) return error;
  const limited = await checkRateLimit(mobileApiLimiter, session.driverId);
  if (limited) return limited;
  const validated = await validateBody(request, schema);
  if (validated.error) return validated.error;
  try {
    return apiResponse.success(
      await completeDriverDelivery(session, {
        deliveryId: id,
        ...validated.data,
      }),
    );
  } catch (caught) {
    const response = deliveryErrorResponse(caught);
    if (response) return response;
    log.error({ err: caught, deliveryId: id }, "Remise de livraison impossible");
    return apiResponse.internalError();
  }
}
