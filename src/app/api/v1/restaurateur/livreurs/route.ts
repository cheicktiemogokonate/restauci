import { NextRequest } from "next/server";
import { requireRestaurateurSession } from "@/app/api/_shared/auth-mobile";
import { deliveryErrorResponse } from "@/app/api/_shared/delivery-response";
import { apiResponse } from "@/app/api/_shared/response";
import { validateBody } from "@/app/api/_shared/validate";
import { createLogger } from "@/infrastructure/logger";
import { checkRateLimit, mobileApiLimiter } from "@/infrastructure/rate-limit";
import { createRestaurantDriverSchema } from "@/modules/deliveries/contracts";
import {
  createRestaurantDriver,
  listRestaurantDrivers,
} from "@/modules/deliveries/server";

const log = createLogger("v1-restaurant-drivers");

export async function GET(request: NextRequest) {
  const { session, error } = await requireRestaurateurSession(request);
  if (error) return error;
  const limited = await checkRateLimit(mobileApiLimiter, session.userId);
  if (limited) return limited;
  try {
    return apiResponse.success(
      await listRestaurantDrivers(session.restaurantId),
    );
  } catch (caught) {
    log.error({ err: caught }, "Lecture de la flotte impossible");
    return apiResponse.internalError();
  }
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireRestaurateurSession(request);
  if (error) return error;
  const limited = await checkRateLimit(mobileApiLimiter, session.userId);
  if (limited) return limited;
  const validated = await validateBody(request, createRestaurantDriverSchema);
  if (validated.error) return validated.error;
  try {
    return apiResponse.created(
      await createRestaurantDriver(session, validated.data),
    );
  } catch (caught) {
    const response = deliveryErrorResponse(caught);
    if (response) return response;
    log.error({ err: caught }, "Création du livreur impossible");
    return apiResponse.internalError();
  }
}
