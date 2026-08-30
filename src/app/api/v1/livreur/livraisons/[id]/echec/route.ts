import { NextRequest } from "next/server";
import { z } from "zod";
import { requireDriverSession } from "@/lib/api/auth-driver";
import { deliveryErrorResponse } from "@/lib/api/delivery-response";
import { apiResponse } from "@/lib/api/response";
import { validateBody } from "@/lib/api/validate";
import { createLogger } from "@/lib/logger";
import { checkRateLimit, mobileApiLimiter } from "@/lib/rate-limit";
import { DELIVERY_FAILURE_REASONS } from "@/modules/deliveries/model";
import { failDriverDelivery } from "@/modules/deliveries/server";

const log = createLogger("v1-driver-delivery-fail");
const schema = z
  .object({
    reason: z.enum(DELIVERY_FAILURE_REASONS),
    note: z.string().trim().min(3).max(500).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.reason === "other" && !value.note) {
      context.addIssue({
        code: "custom",
        path: ["note"],
        message: "Précisez le problème rencontré.",
      });
    }
  });

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
      await failDriverDelivery(session, {
        deliveryId: id,
        ...validated.data,
      }),
    );
  } catch (caught) {
    const response = deliveryErrorResponse(caught);
    if (response) return response;
    log.error({ err: caught, deliveryId: id }, "Échec de livraison impossible");
    return apiResponse.internalError();
  }
}
