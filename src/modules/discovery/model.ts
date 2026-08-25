import type { SubscriptionCataloguePayload } from "@/modules/subscriptions/contracts";
import type { SubscriptionActivityType, SubscriptionPlanCode } from "@/modules/subscriptions/model";

export type DiscoveryActivityType = SubscriptionActivityType;

export interface DiscoveryCandidate {
  resourceId: string;
  partnerAccountId: string;
  planCode: SubscriptionPlanCode;
  /** Position issue du classement organique canonique de l’activité. */
  organicRank: number;
}

export interface DiscoveryRankingContext {
  contextKey: string;
  page: number;
  pageSize: number;
  at: Date;
}

export type DiscoveryPolicy = SubscriptionCataloguePayload["policies"][DiscoveryActivityType];

export type DiscoveryPlanBenefits = Record<
  SubscriptionPlanCode,
  {
    exposureWeight: number;
    searchPromotedEligible: boolean;
    partnerBadgeEnabled: boolean;
  }
>;

export interface RankedDiscoveryCandidate extends DiscoveryCandidate {
  placement: "promoted" | "organic";
}

export interface DiscoveryRankingPage {
  items: RankedDiscoveryCandidate[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  promotedCount: number;
}

export type DiscoveryEventType =
  | "impression"
  | "click"
  | "detail_open"
  | "conversion";

export interface DiscoveryAttributionInput extends RankedDiscoveryCandidate {
  destinationPath: string;
  contextKey: string;
}

export interface DiscoveryPerformanceRow {
  activityType: DiscoveryActivityType;
  planCode: SubscriptionPlanCode;
  placement: "promoted" | "organic";
  impressions: number;
  clicks: number;
  detailOpens: number;
  conversions: number;
  clickThroughRateBps: number;
  conversionRateBps: number;
}
