import type { ActivityType, PartnerAccount, Role } from "@/lib/db/types";

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

type PartnerIdentity = {
  userId: string;
  role: Role;
};

export function assertPartnerAccess(
  identity: PartnerIdentity | null,
  partnerAccount: PartnerAccount | null,
  expectedActivity?: ActivityType,
): PartnerAccount {
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
