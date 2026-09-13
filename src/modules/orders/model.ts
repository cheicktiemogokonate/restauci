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
  | "RESTAURANT_ACTIVITY_UNAVAILABLE"
  | "UNAUTHORIZED_TRANSITION";

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

export const RESTAURANT_ORDER_STATUSES = [
  "en_attente_paiement",
  "recue",
  "en_preparation",
  "prete",
  "servie",
  "annulee",
] as const;

export type RestaurantOrderStatus = (typeof RESTAURANT_ORDER_STATUSES)[number];
export type RestaurantOrderActorType =
  | "restaurant"
  | "client"
  | "delivery"
  | "system";

export const RESTAURANT_ORDER_MODES = [
  "sur_place",
  "livraison",
  "emporter",
] as const;
export type RestaurantOrderMode = (typeof RESTAURANT_ORDER_MODES)[number];

export const RESTAURANT_ORDER_STATUS_LABELS: Record<
  RestaurantOrderStatus,
  string
> = {
  en_attente_paiement: "En attente de paiement",
  recue: "Reçue",
  en_preparation: "En préparation",
  prete: "Prête",
  servie: "Servie",
  annulee: "Annulée",
};

export const RESTAURANT_ORDER_MODE_LABELS: Record<
  RestaurantOrderMode,
  string
> = {
  sur_place: "Sur place",
  livraison: "Livraison",
  emporter: "À emporter",
};

export const RESTAURANT_ORDER_TRANSITIONS: Record<
  RestaurantOrderStatus,
  readonly RestaurantOrderStatus[]
> = {
  en_attente_paiement: ["annulee"],
  recue: ["en_preparation", "annulee"],
  en_preparation: ["prete", "annulee"],
  prete: ["servie", "annulee"],
  servie: [],
  annulee: [],
};

export const RESTAURANT_ORDER_PREVIOUS_STATUSES: Record<
  RestaurantOrderStatus,
  readonly RestaurantOrderStatus[]
> = {
  en_attente_paiement: [],
  recue: ["en_attente_paiement"],
  en_preparation: ["recue"],
  prete: ["en_preparation"],
  servie: ["prete"],
  annulee: ["en_attente_paiement", "recue", "en_preparation", "prete"],
};

export function canRestaurantSetOrderStatus(
  mode: RestaurantOrderMode,
  status: RestaurantOrderStatus,
) {
  return !(mode === "livraison" && status === "servie");
}

const RESTAURANT_ORDER_ACTOR_TARGETS: Record<
  RestaurantOrderActorType,
  readonly RestaurantOrderStatus[]
> = {
  restaurant: ["en_preparation", "prete", "servie", "annulee"],
  client: ["annulee"],
  delivery: ["servie", "annulee"],
  system: ["recue", "annulee"],
};

export function assertRestaurantOrderActorCanTransition(
  actorType: RestaurantOrderActorType,
  targetStatus: RestaurantOrderStatus,
) {
  if (!RESTAURANT_ORDER_ACTOR_TARGETS[actorType].includes(targetStatus)) {
    throw new RestaurantOrderError(
      "UNAUTHORIZED_TRANSITION",
      `L’acteur ${actorType} ne peut pas appliquer l’état ${targetStatus}.`,
    );
  }
}
