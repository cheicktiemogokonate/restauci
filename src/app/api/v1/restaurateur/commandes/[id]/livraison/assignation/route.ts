import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRestaurateurSession } from "@/app/api/_shared/auth-mobile";
import { deliveryErrorResponse } from "@/app/api/_shared/delivery-response";
import { apiResponse } from "@/app/api/_shared/response";
import { validateBody } from "@/app/api/_shared/validate";
import { createLogger } from "@/infrastructure/logger";
import { checkRateLimit, mobileApiLimiter } from "@/infrastructure/rate-limit";
import {
  getRestaurantDelivery,
  proposeDeliveryDriver,
  unassignDeliveryDriver,
} from "@/modules/deliveries/server";

const log = createLogger("v1-delivery-assignment");
const schema = z.object({ driverId: z.string().uuid() }).strict();

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
    const delivery = await getRestaurantDelivery(session.restaurantId, id);
    return delivery
      ? apiResponse.success(delivery)
      : apiResponse.notFound("Livraison");
  } catch (caught) {
    log.error({ err: caught, orderId: id }, "Lecture de livraison impossible");
    return apiResponse.internalError();
  }
}

export async function PUT(
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
      await proposeDeliveryDriver(session, {
        orderId: id,
        driverId: validated.data.driverId,
      }),
    );
  } catch (caught) {
    const response = deliveryErrorResponse(caught);
    if (response) return response;
    log.error({ err: caught, orderId: id }, "Proposition de livraison impossible");
    return apiResponse.internalError();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { session, error } = await requireRestaurateurSession(request);
  if (error) return error;
  const limited = await checkRateLimit(mobileApiLimiter, session.userId);
  if (limited) return limited;
  try {
    const delivery = await getRestaurantDelivery(session.restaurantId, id);
    if (!delivery) return apiResponse.notFound("Livraison");
    return apiResponse.success(
      await unassignDeliveryDriver(session, delivery.id),
    );
  } catch (caught) {
    const response = deliveryErrorResponse(caught);
    if (response) return response;
    log.error({ err: caught, orderId: id }, "Désassignation impossible");
    return apiResponse.internalError();
  }
}
