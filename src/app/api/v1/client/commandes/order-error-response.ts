import { apiResponse } from "@/lib/api/response";
import {
  RestaurantOrderError,
  type RestaurantOrderErrorCode,
} from "@/modules/orders/model";

const geographicCodes = new Set<RestaurantOrderErrorCode>([
  "CURRENT_LOCATION_REQUIRED",
  "CURRENT_LOCATION_STALE",
  "CURRENT_LOCATION_IMPRECISE",
  "DELIVERY_LOCATION_REQUIRED",
  "LOCATION_OUTSIDE_SERVICE_MARKET",
  "RESTAURANT_OUTSIDE_SERVICE_MARKET",
  "SERVICE_MARKET_MISMATCH",
  "SERVICE_MARKET_AMBIGUOUS",
  "RESTAURANT_ACTIVITY_UNAVAILABLE",
]);

export function restaurantOrderErrorResponse(error: RestaurantOrderError) {
  if (error.code === "IDEMPOTENCY_CONFLICT") {
    return apiResponse.error(error.message, "CONFLICT", { status: 409 });
  }
  if (
    error.code === "CASH_NOT_ALLOWED" ||
    error.code === "ONLINE_PAYMENT_UNAVAILABLE"
  ) {
    return apiResponse.error(error.message, "CONFLICT", { status: 409 });
  }
  if (
    error.code === "RESTAURANT_NOT_FOUND" ||
    error.code === "CLIENT_NOT_FOUND"
  ) {
    return apiResponse.error(error.message, "NOT_FOUND", { status: 404 });
  }
  if (geographicCodes.has(error.code)) {
    const code = error.code as
      | "CURRENT_LOCATION_REQUIRED"
      | "CURRENT_LOCATION_STALE"
      | "CURRENT_LOCATION_IMPRECISE"
      | "DELIVERY_LOCATION_REQUIRED"
      | "LOCATION_OUTSIDE_SERVICE_MARKET"
      | "RESTAURANT_OUTSIDE_SERVICE_MARKET"
      | "SERVICE_MARKET_MISMATCH"
      | "SERVICE_MARKET_AMBIGUOUS"
      | "RESTAURANT_ACTIVITY_UNAVAILABLE";
    return apiResponse.error(error.message, code, {
      status: code === "RESTAURANT_ACTIVITY_UNAVAILABLE" ? 409 : 422,
    });
  }
  return apiResponse.error(error.message, "VALIDATION_ERROR", { status: 422 });
}
