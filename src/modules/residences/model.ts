export const RESIDENCE_AUDIT_ACTIONS = [
  "residence_validee",
  "residence_rejetee",
  "residence_suspendue",
  "residence_reactivee",
] as const;

export type ResidenceModerationStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "suspended";

export const RESIDENCE_RESERVATION_STATUSES = [
  "en_attente_paiement",
  "confirmee",
  "annulee",
] as const;

export type ResidenceReservationStatus =
  (typeof RESIDENCE_RESERVATION_STATUSES)[number];

export type ResidenceReservationTemporalStatus =
  | "a_venir"
  | "en_cours"
  | "terminee";

export const RESIDENCE_BOOKING_PAYMENT_METHODS = [
  "mobile_money",
  "card",
] as const;

export type ResidenceBookingPaymentMethod =
  (typeof RESIDENCE_BOOKING_PAYMENT_METHODS)[number];

export type ResidenceBookabilityBlocker =
  | "not_public"
  | "provider_account_missing";

export const RESIDENCE_VISIBILITY_BLOCKERS = [
  "publication_not_requested",
  "admin_review_pending",
  "admin_corrections_required",
  "residence_suspended",
  "identity_not_submitted",
  "identity_review_pending",
  "identity_rejected",
  "location_missing",
  "destination_unserved",
  "destination_ambiguous",
  "residence_service_unavailable",
  "quota_exceeded",
  "partner_publication_disabled",
] as const;

export type ResidenceVisibilityBlocker =
  (typeof RESIDENCE_VISIBILITY_BLOCKERS)[number];

export type ResidenceOwnerIdentityStatus =
  | "not_submitted"
  | "pending"
  | "verified"
  | "rejected";

export type ResidenceDestinationStatus =
  | "missing"
  | "unserved"
  | "ambiguous"
  | "capability_unavailable"
  | "eligible";

export interface ResidenceVisibilityInput {
  publicationIntent: boolean;
  publicationEnabled: boolean;
  moderationStatus: ResidenceModerationStatus;
  ownerIdentityStatus: ResidenceOwnerIdentityStatus;
  destinationStatus: ResidenceDestinationStatus;
  quotaEligible: boolean | null;
}

export interface ResidenceVisibilityEvaluation {
  isPubliclyVisible: boolean;
  blockers: ResidenceVisibilityBlocker[];
}

export function evaluateResidenceVisibility(
  input: ResidenceVisibilityInput,
): ResidenceVisibilityEvaluation {
  if (!input.publicationIntent || input.moderationStatus === "draft") {
    return {
      isPubliclyVisible: false,
      blockers: ["publication_not_requested"],
    };
  }
  if (input.moderationStatus === "pending") {
    return {
      isPubliclyVisible: false,
      blockers: ["admin_review_pending"],
    };
  }
  if (input.moderationStatus === "rejected") {
    return {
      isPubliclyVisible: false,
      blockers: ["admin_corrections_required"],
    };
  }
  if (input.moderationStatus === "suspended") {
    return {
      isPubliclyVisible: false,
      blockers: ["residence_suspended"],
    };
  }

  const blockers: ResidenceVisibilityBlocker[] = [];
  if (input.ownerIdentityStatus === "not_submitted") {
    blockers.push("identity_not_submitted");
  } else if (input.ownerIdentityStatus === "pending") {
    blockers.push("identity_review_pending");
  } else if (input.ownerIdentityStatus === "rejected") {
    blockers.push("identity_rejected");
  }

  if (input.destinationStatus === "missing") {
    blockers.push("location_missing");
  } else if (input.destinationStatus === "unserved") {
    blockers.push("destination_unserved");
  } else if (input.destinationStatus === "ambiguous") {
    blockers.push("destination_ambiguous");
  } else if (input.destinationStatus === "capability_unavailable") {
    blockers.push("residence_service_unavailable");
  }

  if (blockers.length === 0 && input.quotaEligible === false) {
    blockers.push("quota_exceeded");
  }

  if (blockers.length === 0 && !input.publicationEnabled) {
    blockers.push("partner_publication_disabled");
  }

  return {
    isPubliclyVisible:
      blockers.length === 0 &&
      input.publicationEnabled &&
      input.quotaEligible === true,
    blockers,
  };
}

export type ResidenceDomainErrorCode =
  | "RESIDENCE_NOT_FOUND"
  | "RESIDENCE_NOT_EDITABLE"
  | "RESIDENCE_NOT_REVIEWABLE"
  | "RESIDENCE_NOT_SUSPENDABLE"
  | "RESIDENCE_NOT_REACTIVATABLE"
  | "RESIDENCE_NOT_PUBLISHABLE"
  | "RESIDENCE_NOT_WITHDRAWABLE"
  | "RESIDENCE_QUOTA_EXCEEDED"
  | "RESIDENCE_STAY_INVALID"
  | "RESIDENCE_UNAVAILABLE"
  | "RESIDENCE_NOT_BOOKABLE"
  | "RESIDENCE_RESERVATION_NOT_FOUND"
  | "RESIDENCE_RESERVATION_NOT_EDITABLE"
  | "RESIDENCE_RESERVATION_NOT_CANCELLABLE"
  | "RESIDENCE_BLOCK_CONFLICT"
  | "RESIDENCE_MEDIA_INVALID"
  | "RESIDENCE_ACTIVITY_REQUIRED";

export class ResidenceDomainError extends Error {
  constructor(
    public readonly code: ResidenceDomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ResidenceDomainError";
  }
}

export function getResidenceModerationStatus(input: {
  publicationIntent: boolean;
  actif: boolean;
  suspendu: boolean;
  motifRejet: string | null;
}): ResidenceModerationStatus {
  if (input.suspendu) return "suspended";
  if (input.motifRejet) return "rejected";
  if (input.actif) return "approved";
  if (input.publicationIntent) return "pending";
  return "draft";
}

export function residenceSlugBase(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 170)
    .replace(/-+$/g, "");
  return slug || "residence";
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isoDateDayNumber(value: string): number {
  if (!ISO_DATE_PATTERN.test(value)) {
    throw new ResidenceDomainError(
      "RESIDENCE_STAY_INVALID",
      "La date de séjour est invalide.",
    );
  }
  const [year, month, day] = value.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new ResidenceDomainError(
      "RESIDENCE_STAY_INVALID",
      "La date de séjour est invalide.",
    );
  }
  return Math.floor(date.getTime() / 86_400_000);
}

export function getResidenceStayNights(input: {
  checkIn: string;
  checkOut: string;
}): number {
  const nights =
    isoDateDayNumber(input.checkOut) - isoDateDayNumber(input.checkIn);
  if (nights < 1) {
    throw new ResidenceDomainError(
      "RESIDENCE_STAY_INVALID",
      "La date de départ doit être postérieure à la date d’arrivée.",
    );
  }
  return nights;
}

export function validateResidenceStay(input: {
  checkIn: string;
  checkOut: string;
  guests: number;
  maxGuests: number;
  today: string;
}) {
  const nights = getResidenceStayNights(input);
  if (isoDateDayNumber(input.checkIn) < isoDateDayNumber(input.today)) {
    throw new ResidenceDomainError(
      "RESIDENCE_STAY_INVALID",
      "La date d’arrivée ne peut pas être passée.",
    );
  }
  if (!Number.isInteger(input.guests) || input.guests < 1) {
    throw new ResidenceDomainError(
      "RESIDENCE_STAY_INVALID",
      "Le nombre de voyageurs doit être au moins égal à 1.",
    );
  }
  if (input.guests > input.maxGuests) {
    throw new ResidenceDomainError(
      "RESIDENCE_STAY_INVALID",
      `Cette résidence accueille au maximum ${input.maxGuests} voyageurs.`,
    );
  }
  return { nights };
}

export function residenceDateRangesOverlap(
  first: { checkIn: string; checkOut: string },
  second: { checkIn: string; checkOut: string },
) {
  return first.checkIn < second.checkOut && first.checkOut > second.checkIn;
}

export function getResidenceReservationTemporalStatus(input: {
  checkIn: string;
  checkOut: string;
  today: string;
}): ResidenceReservationTemporalStatus {
  if (input.today < input.checkIn) return "a_venir";
  if (input.today >= input.checkOut) return "terminee";
  return "en_cours";
}

export function getTodayInAbidjan(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Abidjan",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
