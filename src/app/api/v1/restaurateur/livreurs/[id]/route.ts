import { NextRequest } from "next/server";
import { requireRestaurateurSession } from "@/app/api/_shared/auth-mobile";
import { deliveryErrorResponse } from "@/app/api/_shared/delivery-response";
import { apiResponse } from "@/app/api/_shared/response";
import { validateBody } from "@/app/api/_shared/validate";
import { createLogger } from "@/infrastructure/logger";
import { checkRateLimit, mobileApiLimiter } from "@/infrastructure/rate-limit";
import { updateRestaurantDriverSchema } from "@/modules/deliveries/contracts";
import {
  listRestaurantDrivers,
  updateRestaurantDriver,
} from "@/modules/deliveries/server";

const log = createLogger("v1-restaurant-driver");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { session, error } = await requireRestaurateurSession(request);
  if (error) return error;
  const limited = await checkRateLimit(mobileApiLimiter, session.userId);
  if (limited) return limited;
  try {
    const driver = (await listRestaurantDrivers(session.restaurantId)).find(
      (item) => item.id === id,
    );
    return driver ? apiResponse.success(driver) : apiResponse.notFound("Livreur");
  } catch (caught) {
    log.error({ err: caught, driverId: id }, "Lecture du livreur impossible");
    return apiResponse.internalError();
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { session, error } = await requireRestaurateurSession(request);
  if (error) return error;
  const limited = await checkRateLimit(mobileApiLimiter, session.userId);
  if (limited) return limited;
  const validated = await validateBody(request, updateRestaurantDriverSchema);
  if (validated.error) return validated.error;
  try {
    return apiResponse.success(
      await updateRestaurantDriver(session, id, validated.data),
    );
  } catch (caught) {
    const response = deliveryErrorResponse(caught);
    if (response) return response;
    log.error({ err: caught, driverId: id }, "Modification du livreur impossible");
    return apiResponse.internalError();
  }
}
