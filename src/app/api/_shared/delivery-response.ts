import { ZodError } from "zod";
import type { NextResponse } from "next/server";
import { DeliveryDomainError } from "@/modules/deliveries/server";
import { apiResponse } from "./response";

const UNAUTHORIZED = new Set([
  "DRIVER_INVALID_CREDENTIALS",
  "DRIVER_TEMP_PASSWORD_EXPIRED",
  "DRIVER_ACTIVATION_INVALID",
  "DRIVER_SESSION_INVALID",
  "DRIVER_SESSION_REPLAYED",
]);
const FORBIDDEN = new Set([
  "DRIVER_NOT_ACTIVE",
  "RESTAURANT_SCOPE_MISMATCH",
]);
const NOT_FOUND = new Set([
  "DRIVER_NOT_FOUND",
  "DELIVERY_NOT_FOUND",
  "OFFER_NOT_FOUND",
]);

export function deliveryErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof ZodError) {
    const flattened = error.flatten();
    return apiResponse.validationError(
      {
        ...(flattened.fieldErrors as Record<string, string[]>),
        ...(flattened.formErrors.length > 0
          ? { _form: flattened.formErrors }
          : {}),
      },
    );
  }
  if (!(error instanceof DeliveryDomainError)) return null;
  if (UNAUTHORIZED.has(error.code)) return apiResponse.unauthorized(error.message);
  if (FORBIDDEN.has(error.code)) return apiResponse.forbidden(error.message);
  if (NOT_FOUND.has(error.code)) return apiResponse.notFound(error.message.replace(/ introuvable\.?$/, ""));
  return apiResponse.error(error.message, "CONFLICT", { status: 409 });
}
