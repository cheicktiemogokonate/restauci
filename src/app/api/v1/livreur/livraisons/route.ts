import { NextRequest } from "next/server";
import { requireDriverSession } from "@/app/api/_shared/auth-driver";
import { deliveryErrorResponse } from "@/app/api/_shared/delivery-response";
import { apiResponse } from "@/app/api/_shared/response";
import { createLogger } from "@/infrastructure/logger";
import { checkRateLimit, mobileApiLimiter } from "@/infrastructure/rate-limit";
import { listDriverDeliveries } from "@/modules/deliveries/server";

const log = createLogger("v1-driver-deliveries");

export async function GET(request: NextRequest) {
  const { session, error } = await requireDriverSession(request);
  if (error) return error;
  const limited = await checkRateLimit(mobileApiLimiter, session.driverId);
  if (limited) return limited;
  try {
    const result = await listDriverDeliveries(
      session,
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );
    return apiResponse.success(result.items, {
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
        hasNext: result.page * result.limit < result.total,
        hasPrev: result.page > 1,
      },
    });
  } catch (caught) {
    const response = deliveryErrorResponse(caught);
    if (response) return response;
    log.error({ err: caught }, "Lecture des livraisons impossible");
    return apiResponse.internalError();
  }
}
