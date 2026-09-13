export const PARTNER_ACTIVITY_TYPES = ["restaurant", "residence"] as const;

export type PartnerActivityType = (typeof PARTNER_ACTIVITY_TYPES)[number];

export interface PartnerAccountState {
  id: string;
  userId: string;
  activityType: PartnerActivityType;
}

export interface PartnerIdentity {
  userId: string;
  role: "partner" | "admin";
}

export class PartnerAuthorizationError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "unauthenticated"
      | "not_partner"
      | "missing_partner_account"
      | "wrong_activity",
  ) {
    super(message);
    this.name = "PartnerAuthorizationError";
  }
}

export function assertPartnerAccess<TAccount extends PartnerAccountState>(
  identity: PartnerIdentity | null,
  partnerAccount: TAccount | null,
  expectedActivity?: PartnerActivityType,
): TAccount {
  if (!identity) {
    throw new PartnerAuthorizationError(
      "Session partenaire requise",
      "unauthenticated",
    );
  }
  if (identity.role !== "partner") {
    throw new PartnerAuthorizationError(
      "Accès réservé aux partenaires",
      "not_partner",
    );
  }
  if (!partnerAccount || partnerAccount.userId !== identity.userId) {
    throw new PartnerAuthorizationError(
      "Compte partenaire introuvable ou incohérent",
      "missing_partner_account",
    );
  }
  if (expectedActivity && partnerAccount.activityType !== expectedActivity) {
    throw new PartnerAuthorizationError(
      `Cette action nécessite l’activité ${expectedActivity}`,
      "wrong_activity",
    );
  }
  return partnerAccount;
}

export class PartnerAccountDomainError extends Error {
  constructor(
    public readonly code:
      | "ACTIVITY_ALREADY_SELECTED"
      | "ACCOUNT_CREATION_FAILED"
      | "ACCOUNT_NOT_FOUND"
      | "ACCOUNT_ACTIVITY_MISMATCH",
    message: string,
  ) {
    super(message);
    this.name = "PartnerAccountDomainError";
  }
}
