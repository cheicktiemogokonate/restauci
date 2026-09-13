export const SUBSCRIPTION_PLAN_CODES = [
  "decouverte",
  "croissance",
  "partenaire_fier",
] as const;

export type SubscriptionPlanCode = (typeof SUBSCRIPTION_PLAN_CODES)[number];

export type SubscriptionResourceLimit = number | null;

export type RestaurantCatalogueLimits = {
  category: SubscriptionResourceLimit;
  dish: SubscriptionResourceLimit;
};

export type ResidenceCatalogueLimits = {
  residence: SubscriptionResourceLimit;
};

export interface SubscriptionPlanPresentation {
  exposureWeight: number;
  searchPromotedEligible: boolean;
  marketFeaturedEligible: boolean;
  homepageFeaturedEligible: boolean;
  partnerBadgeEnabled: boolean;
  recommended: boolean;
  ctaLabel: string;
  features: string[];
}

export interface SubscriptionCataloguePlan {
  code: SubscriptionPlanCode;
  nom: string;
  description: string | null;
  prixAnnuelFcfa: number;
  tauxCommissionBps: number;
  restaurantLimits: RestaurantCatalogueLimits;
  residenceLimits: ResidenceCatalogueLimits;
  ordre: number;
  actif: boolean;
  presentation: Record<SubscriptionActivityType, SubscriptionPlanPresentation>;
}

export interface SubscriptionDiscoveryPolicy {
  enabled: boolean;
  sponsoredShareBps: number;
  rotationWindowMinutes: number;
  maxPromotedPerPartner: number;
}

export interface SubscriptionCataloguePayload {
  schemaVersion: 1;
  plans: SubscriptionCataloguePlan[];
  policies: Record<SubscriptionActivityType, SubscriptionDiscoveryPolicy>;
}

export const SUBSCRIPTION_ACTIVITY_TYPES = ["restaurant", "residence"] as const;
export type SubscriptionActivityType =
  (typeof SUBSCRIPTION_ACTIVITY_TYPES)[number];

export const DEFAULT_DISCOVERY_POLICY = {
  enabled: true,
  sponsoredShareBps: 2_500,
  rotationWindowMinutes: 1_440,
  maxPromotedPerPartner: 1,
} as const;

export const DEFAULT_PLAN_EXPOSURE = {
  decouverte: {
    exposureWeight: 1,
    searchPromotedEligible: false,
    marketFeaturedEligible: false,
    homepageFeaturedEligible: false,
    partnerBadgeEnabled: false,
    recommended: false,
  },
  croissance: {
    exposureWeight: 3,
    searchPromotedEligible: true,
    marketFeaturedEligible: false,
    homepageFeaturedEligible: false,
    partnerBadgeEnabled: false,
    recommended: false,
  },
  partenaire_fier: {
    exposureWeight: 6,
    searchPromotedEligible: true,
    marketFeaturedEligible: true,
    homepageFeaturedEligible: true,
    partnerBadgeEnabled: true,
    recommended: true,
  },
} as const satisfies Record<
  SubscriptionPlanCode,
  {
    exposureWeight: number;
    searchPromotedEligible: boolean;
    marketFeaturedEligible: boolean;
    homepageFeaturedEligible: boolean;
    partnerBadgeEnabled: boolean;
    recommended: boolean;
  }
>;

export const OFFLINE_SUBSCRIPTION_PAYMENT_METHODS = [
  "mobile_money",
  "virement",
  "especes",
  "cheque",
] as const;

export type OfflineSubscriptionPaymentMethod =
  (typeof OFFLINE_SUBSCRIPTION_PAYMENT_METHODS)[number];

export type OrderedPlan = {
  code: string;
  ordre: number;
  prixAnnuelFcfa: number;
  actif: boolean;
};

export type SubscriptionTransition =
  | { allowed: true; kind: "first_paid" | "upgrade" }
  | {
      allowed: false;
      reason: "discovery_not_purchasable" | "unavailable" | "same_plan" | "downgrade";
    };

export function evaluateSubscriptionTransition(
  currentPaidPlan: OrderedPlan | null,
  targetPlan: OrderedPlan,
): SubscriptionTransition {
  if (!targetPlan.actif) return { allowed: false, reason: "unavailable" };
  if (targetPlan.code === "decouverte" || targetPlan.prixAnnuelFcfa <= 0) {
    return { allowed: false, reason: "discovery_not_purchasable" };
  }
  if (!currentPaidPlan) return { allowed: true, kind: "first_paid" };
  if (targetPlan.code === currentPaidPlan.code) {
    return { allowed: false, reason: "same_plan" };
  }
  if (targetPlan.ordre <= currentPaidPlan.ordre) {
    return { allowed: false, reason: "downgrade" };
  }
  return { allowed: true, kind: "upgrade" };
}

export function subscriptionTransitionError(
  transition: Exclude<SubscriptionTransition, { allowed: true }>,
): string {
  switch (transition.reason) {
    case "discovery_not_purchasable":
      return "Découverte est le plan gratuit appliqué automatiquement, sans souscription";
    case "unavailable":
      return "Cette offre n’est pas disponible";
    case "same_plan":
      return "Le renouvellement anticipé du même plan n’est pas autorisé";
    case "downgrade":
      return "Le passage vers une offre inférieure n’est pas autorisé pendant un abonnement actif";
  }
}

export function addOneSubscriptionYear(startAt: Date): Date {
  const endAt = new Date(startAt);
  endAt.setFullYear(endAt.getFullYear() + 1);
  return endAt;
}

export function isPaidPeriodEffective(
  period: {
    planCode: string;
    statut: string;
    dateDebut: Date;
    dateEcheance: Date | null;
  },
  now: Date,
): boolean {
  return (
    period.planCode !== "decouverte" &&
    period.statut === "active" &&
    period.dateDebut <= now &&
    period.dateEcheance !== null &&
    period.dateEcheance > now
  );
}

export function buildUpgradeClosure(endedAt: Date) {
  return {
    statut: "terminee" as const,
    endedAt,
    endReason: "upgrade" as const,
  };
}

export function buildReactivationDecision(dateEcheance: Date, now: Date) {
  if (dateEcheance <= now) {
    return {
      reactivated: false as const,
      update: {
        statut: "expiree" as const,
        endedAt: dateEcheance,
        endReason: "expiration_naturelle" as const,
      },
    };
  }
  return {
    reactivated: true as const,
    update: { statut: "active" as const, dateEcheance },
  };
}
