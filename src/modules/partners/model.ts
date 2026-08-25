export const PARTNER_ACTIVITY_TYPES = ["restaurant", "residence"] as const;

export type PartnerActivityType = (typeof PARTNER_ACTIVITY_TYPES)[number];

export class PartnerAccountDomainError extends Error {
  constructor(
    public readonly code: "ACTIVITY_ALREADY_SELECTED" | "ACCOUNT_CREATION_FAILED",
    message: string,
  ) {
    super(message);
    this.name = "PartnerAccountDomainError";
  }
}
