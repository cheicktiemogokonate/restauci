export interface RestaurantAvailabilityState {
  actif: boolean;
  suspendu: boolean;
  enLigne: boolean;
  accepteCommandes: boolean;
}

/** Peut être présenté dans les listes, la recherche et la fiche publiques. */
export function isRestaurantPubliclyVisible(
  restaurant: Pick<RestaurantAvailabilityState, "actif" | "suspendu">,
): boolean {
  return restaurant.actif && !restaurant.suspendu;
}

/** Peut accepter une nouvelle commande au moment de la validation serveur. */
export function isRestaurantOrderable(
  restaurant: RestaurantAvailabilityState,
): boolean {
  return (
    isRestaurantPubliclyVisible(restaurant) &&
    restaurant.enLigne &&
    restaurant.accepteCommandes
  );
}

export type RestaurantMarketErrorCode =
  | "CURRENT_LOCATION_REQUIRED"
  | "CURRENT_LOCATION_STALE"
  | "CURRENT_LOCATION_IMPRECISE"
  | "LOCATION_OUTSIDE_SERVICE_MARKET"
  | "SERVICE_MARKET_AMBIGUOUS"
  | "RESTAURANT_ACTIVITY_UNAVAILABLE";

export class RestaurantMarketError extends Error {
  constructor(
    public readonly code: RestaurantMarketErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "RestaurantMarketError";
  }
}

export type RestaurantOrderabilityReason =
  | "RESTAURANT_OFFLINE"
  | "RESTAURANT_NOT_ACCEPTING_ORDERS"
  | "RESTAURANT_NOT_PUBLIC"
  | "CURRENT_LOCATION_REQUIRED"
  | "RESTAURANT_OUTSIDE_SERVICE_MARKET"
  | "SERVICE_MARKET_MISMATCH"
  | "RESTAURANT_ACTIVITY_UNAVAILABLE";

export function evaluateRestaurantOrderability(input: {
  restaurant: RestaurantAvailabilityState;
  policyMode: "off" | "shadow" | "enforce";
  hasMarketAssignment: boolean;
  sameServiceMarket: boolean | null;
  restaurantCapabilityActive: boolean;
}): { orderable: boolean; reason: RestaurantOrderabilityReason | null } {
  if (!isRestaurantPubliclyVisible(input.restaurant)) {
    return { orderable: false, reason: "RESTAURANT_NOT_PUBLIC" };
  }
  if (!input.restaurant.enLigne) {
    return { orderable: false, reason: "RESTAURANT_OFFLINE" };
  }
  if (!input.restaurant.accepteCommandes) {
    return { orderable: false, reason: "RESTAURANT_NOT_ACCEPTING_ORDERS" };
  }
  if (input.policyMode !== "enforce") {
    return { orderable: true, reason: null };
  }
  if (!input.hasMarketAssignment) {
    return {
      orderable: false,
      reason: "RESTAURANT_OUTSIDE_SERVICE_MARKET",
    };
  }
  if (!input.restaurantCapabilityActive) {
    return {
      orderable: false,
      reason: "RESTAURANT_ACTIVITY_UNAVAILABLE",
    };
  }
  if (input.sameServiceMarket === null) {
    return { orderable: false, reason: "CURRENT_LOCATION_REQUIRED" };
  }
  if (!input.sameServiceMarket) {
    return { orderable: false, reason: "SERVICE_MARKET_MISMATCH" };
  }
  return { orderable: true, reason: null };
}
