import { NextRequest } from "next/server";
import { getClientSession } from "@/app/api/_shared/auth-client";
import { apiResponse } from "@/app/api/_shared/response";
import { validateBody } from "@/app/api/_shared/validate";
import { createLogger } from "@/infrastructure/logger";
import { checkRateLimit, commandeClientLimiter } from "@/infrastructure/rate-limit";
import { prevalidateRestaurantOrderSchema } from "@/modules/orders/contracts";
import { RestaurantOrderError } from "@/modules/orders/model";
import { prevalidateRestaurantOrder } from "@/modules/orders/server";
import { restaurantOrderErrorResponse } from "../order-error-response";

const log = createLogger("v1-client-commandes-prevalidate");

export async function POST(request: NextRequest) {
  const { session, error } = await getClientSession(request);
  if (error) return error;
  const limited = await checkRateLimit(
    commandeClientLimiter,
    session.clientId,
  );
  if (limited) return limited;

  const { data, error: validationError } = await validateBody(
    request,
    prevalidateRestaurantOrderSchema,
  );
  if (validationError) return validationError;
  try {
    return apiResponse.success(await prevalidateRestaurantOrder(data));
  } catch (error) {
    if (error instanceof RestaurantOrderError) {
      return restaurantOrderErrorResponse(error);
    }
    log.error({ error }, "Échec prévalidation commande restaurant");
    return apiResponse.internalError();
  }
}
