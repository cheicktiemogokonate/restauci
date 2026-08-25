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
