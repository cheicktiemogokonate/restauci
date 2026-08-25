export type RestaurantOrderErrorCode =
  | "CLIENT_NOT_FOUND"
  | "RESTAURANT_NOT_FOUND"
  | "RESTAURANT_NOT_ORDERABLE"
  | "CASH_NOT_ALLOWED"
  | "ONLINE_PAYMENT_UNAVAILABLE"
  | "ORDER_MODE_NOT_SUPPORTED"
  | "DISH_NOT_ORDERABLE"
  | "MINIMUM_ORDER_NOT_REACHED"
  | "IDEMPOTENCY_CONFLICT"
  | "INVALID_QUANTITY"
  | "CURRENT_LOCATION_REQUIRED"
  | "CURRENT_LOCATION_STALE"
  | "CURRENT_LOCATION_IMPRECISE"
  | "DELIVERY_LOCATION_REQUIRED"
  | "LOCATION_OUTSIDE_SERVICE_MARKET"
  | "RESTAURANT_OUTSIDE_SERVICE_MARKET"
  | "SERVICE_MARKET_MISMATCH"
  | "SERVICE_MARKET_AMBIGUOUS"
  | "RESTAURANT_ACTIVITY_UNAVAILABLE";

export class RestaurantOrderError extends Error {
  constructor(
    public readonly code: RestaurantOrderErrorCode,
    message: string,
    public readonly details?: Record<string, unknown> & {
      minimumFcfa?: number;
    },
  ) {
    super(message);
    this.name = "RestaurantOrderError";
  }
}

export const RESTAURANT_GEO_POLICY_VERSION = "restaurant-market-v1";
