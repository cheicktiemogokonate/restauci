export const DELIVERY_STATUSES = [
  "en_attente",
  "assignee",
  "en_route",
  "livree",
  "echouee",
  "annulee",
] as const;

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const DELIVERY_OFFER_STATUSES = [
  "pending",
  "accepted",
  "declined",
  "expired",
  "cancelled",
] as const;

export type DeliveryOfferStatus = (typeof DELIVERY_OFFER_STATUSES)[number];

export const DRIVER_AVAILABILITY_STATES = [
  "disabled",
  "access_pending",
  "unavailable",
  "requested",
  "available",
  "busy",
] as const;

export type DriverAvailabilityState =
  (typeof DRIVER_AVAILABILITY_STATES)[number];

export const DELIVERY_ACTOR_TYPES = [
  "restaurant",
  "driver",
  "client",
  "system",
] as const;

export type DeliveryActorType = (typeof DELIVERY_ACTOR_TYPES)[number];

export const DELIVERY_PROOF_METHODS = ["client_code", "client_app"] as const;
export type DeliveryProofMethod = (typeof DELIVERY_PROOF_METHODS)[number];

export const DRIVER_CASH_COLLECTION_STATUSES = ["held", "remitted"] as const;
export type DriverCashCollectionStatus =
  (typeof DRIVER_CASH_COLLECTION_STATUSES)[number];

export const DELIVERY_FAILURE_REASONS = [
  "client_absent",
  "client_unreachable",
  "address_inaccessible",
  "vehicle_problem",
  "order_damaged",
  "payment_refused",
  "other",
] as const;

export type DeliveryFailureReason =
  (typeof DELIVERY_FAILURE_REASONS)[number];

export const DELIVERY_OFFER_DECLINE_REASONS = [
  "unavailable",
  "distance",
  "vehicle_problem",
  "other",
] as const;

export type DeliveryOfferDeclineReason =
  (typeof DELIVERY_OFFER_DECLINE_REASONS)[number];

export const DELIVERY_EVENT_TYPES = [
  "driver_created",
  "driver_updated",
  "driver_deactivated",
  "driver_credentials_issued",
  "driver_credentials_reset",
  "driver_credentials_activated",
  "driver_availability_changed",
  "offer_created",
  "offer_accepted",
  "offer_declined",
  "offer_expired",
  "offer_cancelled",
  "delivery_unassigned",
  "delivery_assigned",
  "delivery_reassigned",
  "delivery_started",
  "delivery_completed",
  "delivery_failed",
  "delivery_cancelled",
  "delivery_proof_issued",
  "delivery_proof_verified",
  "cash_collected",
  "cash_remitted",
  "driver_compensation_paid",
] as const;

export type DeliveryEventType = (typeof DELIVERY_EVENT_TYPES)[number];

export const ACTIVE_DELIVERY_STATUSES = ["assignee", "en_route"] as const;
export const DELIVERY_OFFER_TTL_MS = 5 * 60 * 1_000;
export const DELIVERY_PROOF_CODE_LENGTH = 6;

export type DeliveryDomainErrorCode =
  | "DRIVER_INVALID_CREDENTIALS"
  | "DRIVER_TEMP_PASSWORD_EXPIRED"
  | "DRIVER_ACTIVATION_INVALID"
  | "DRIVER_SESSION_INVALID"
  | "DRIVER_SESSION_REPLAYED"
  | "DRIVER_NOT_FOUND"
  | "DRIVER_NOT_ACTIVE"
  | "DRIVER_ACCESS_PENDING"
  | "DRIVER_UNAVAILABLE"
  | "DRIVER_BUSY"
  | "DRIVER_ALREADY_REQUESTED"
  | "DELIVERY_NOT_FOUND"
  | "DELIVERY_NOT_ASSIGNABLE"
  | "DELIVERY_NOT_STARTABLE"
  | "DELIVERY_NOT_COMPLETABLE"
  | "DELIVERY_NOT_FAILABLE"
  | "DELIVERY_NOT_REASSIGNABLE"
  | "DELIVERY_NOT_CANCELLABLE"
  | "DELIVERY_PROOF_REQUIRED"
  | "DELIVERY_PROOF_INVALID"
  | "DELIVERY_CASH_CONFIRMATION_REQUIRED"
  | "CASH_REMITTANCE_INVALID"
  | "DRIVER_COMPENSATION_PAYMENT_INVALID"
  | "OFFER_NOT_FOUND"
  | "OFFER_NOT_PENDING"
  | "OFFER_EXPIRED"
  | "ORDER_NOT_DELIVERABLE"
  | "ORDER_NOT_READY"
  | "RESTAURANT_SCOPE_MISMATCH";

export class DeliveryDomainError extends Error {
  constructor(
    public readonly code: DeliveryDomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DeliveryDomainError";
  }
}

export interface DriverAvailabilityInput {
  active: boolean;
  credentialsReady: boolean;
  declaredAvailable: boolean;
  hasActiveDelivery: boolean;
  hasPendingOffer: boolean;
}

export function getDriverAvailability(
  input: DriverAvailabilityInput,
): DriverAvailabilityState {
  if (!input.active) return "disabled";
  if (!input.credentialsReady) return "access_pending";
  if (input.hasActiveDelivery) return "busy";
  if (input.hasPendingOffer) return "requested";
  if (!input.declaredAvailable) return "unavailable";
  return "available";
}

export function isDriverAssignable(input: DriverAvailabilityInput): boolean {
  return getDriverAvailability(input) === "available";
}

export function isActiveDeliveryStatus(
  status: DeliveryStatus,
): status is (typeof ACTIVE_DELIVERY_STATUSES)[number] {
  return ACTIVE_DELIVERY_STATUSES.includes(
    status as (typeof ACTIVE_DELIVERY_STATUSES)[number],
  );
}

export function isOfferExpired(expiresAt: Date, now = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}

export function getDeliveryOfferExpiry(now = new Date()): Date {
  return new Date(now.getTime() + DELIVERY_OFFER_TTL_MS);
}

export function assertOrderCanReceiveDeliveryOffer(status: string): void {
  if (status !== "en_preparation" && status !== "prete") {
    throw new DeliveryDomainError(
      "ORDER_NOT_DELIVERABLE",
      "Une proposition de livraison exige une commande en préparation ou prête.",
    );
  }
}

export function assertOfferCanBeAccepted(input: {
  offerStatus: DeliveryOfferStatus;
  expiresAt: Date;
  now?: Date;
  driver: DriverAvailabilityInput;
  deliveryStatus: DeliveryStatus;
}): void {
  if (input.offerStatus !== "pending") {
    throw new DeliveryDomainError(
      "OFFER_NOT_PENDING",
      "Cette proposition a déjà été traitée.",
    );
  }
  if (isOfferExpired(input.expiresAt, input.now)) {
    throw new DeliveryDomainError(
      "OFFER_EXPIRED",
      "Cette proposition de livraison a expiré.",
    );
  }
  if (!isDriverAssignable(input.driver)) {
    const state = getDriverAvailability(input.driver);
    const code: DeliveryDomainErrorCode =
      state === "busy"
        ? "DRIVER_BUSY"
        : state === "access_pending"
          ? "DRIVER_ACCESS_PENDING"
          : state === "disabled"
            ? "DRIVER_NOT_ACTIVE"
            : state === "requested"
              ? "DRIVER_ALREADY_REQUESTED"
              : "DRIVER_UNAVAILABLE";
    throw new DeliveryDomainError(
      code,
      "Le livreur n'est plus disponible pour cette proposition.",
    );
  }
  if (
    input.deliveryStatus !== "en_attente" &&
    input.deliveryStatus !== "echouee"
  ) {
    throw new DeliveryDomainError(
      "DELIVERY_NOT_ASSIGNABLE",
      "Cette livraison ne peut plus être assignée.",
    );
  }
}

export type DeliveryTransitionAction =
  | "assign"
  | "unassign"
  | "start"
  | "complete"
  | "fail"
  | "cancel";

const DELIVERY_TRANSITIONS: Record<
  DeliveryTransitionAction,
  readonly DeliveryStatus[]
> = {
  assign: ["en_attente", "echouee"],
  unassign: ["assignee"],
  start: ["assignee"],
  complete: ["en_route"],
  fail: ["en_route"],
  cancel: ["en_attente", "assignee", "echouee"],
};

export function canApplyDeliveryTransition(
  status: DeliveryStatus,
  action: DeliveryTransitionAction,
): boolean {
  return DELIVERY_TRANSITIONS[action].includes(status);
}

export function getDeliveryTransitionTarget(
  status: DeliveryStatus,
  action: DeliveryTransitionAction,
): DeliveryStatus {
  if (!canApplyDeliveryTransition(status, action)) {
    const codes: Record<DeliveryTransitionAction, DeliveryDomainErrorCode> = {
      assign: "DELIVERY_NOT_ASSIGNABLE",
      unassign: "DELIVERY_NOT_REASSIGNABLE",
      start: "DELIVERY_NOT_STARTABLE",
      complete: "DELIVERY_NOT_COMPLETABLE",
      fail: "DELIVERY_NOT_FAILABLE",
      cancel: "DELIVERY_NOT_CANCELLABLE",
    };
    throw new DeliveryDomainError(
      codes[action],
      `Transition ${action} interdite depuis l'état ${status}.`,
    );
  }

  const targets: Record<DeliveryTransitionAction, DeliveryStatus> = {
    assign: "assignee",
    unassign: "en_attente",
    start: "en_route",
    complete: "livree",
    fail: "echouee",
    cancel: "annulee",
  };
  return targets[action];
}

export function assertDeliveryCanStart(input: {
  deliveryStatus: DeliveryStatus;
  orderStatus: string;
}): void {
  getDeliveryTransitionTarget(input.deliveryStatus, "start");
  if (input.orderStatus !== "prete") {
    throw new DeliveryDomainError(
      "ORDER_NOT_READY",
      "La commande doit être prête avant la récupération.",
    );
  }
}

export function assertDeliveryCanComplete(input: {
  deliveryStatus: DeliveryStatus;
  proofVerified: boolean;
  cashRequired: boolean;
  cashCollected: boolean;
}): void {
  getDeliveryTransitionTarget(input.deliveryStatus, "complete");
  if (!input.proofVerified) {
    throw new DeliveryDomainError(
      "DELIVERY_PROOF_REQUIRED",
      "La confirmation du client est requise avant de terminer la livraison.",
    );
  }
  if (input.cashRequired && !input.cashCollected) {
    throw new DeliveryDomainError(
      "DELIVERY_CASH_CONFIRMATION_REQUIRED",
      "Confirmez l'encaissement du montant dû avant de terminer la livraison.",
    );
  }
}

export function shouldDeclinePendingOfferWhenUnavailable(input: {
  offerStatus: DeliveryOfferStatus | null;
  declaredAvailable: boolean;
}): boolean {
  return input.offerStatus === "pending" && !input.declaredAvailable;
}
