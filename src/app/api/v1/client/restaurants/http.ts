import { apiResponse } from "@/app/api/_shared/response";
import { RestaurantMarketError } from "@/modules/restaurants/model";

export function restaurantMarketErrorResponse(error: RestaurantMarketError) {
  const status =
    error.code === "RESTAURANT_ACTIVITY_UNAVAILABLE"
      ? 409
      : error.code === "CURRENT_LOCATION_REQUIRED"
        ? 422
        : 422;
  return apiResponse.error(error.message, error.code, { status });
}
