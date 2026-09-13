import "server-only";

import {
  rankDiscoveryPage,
  type DiscoveryActivityType,
  type DiscoveryPlanBenefits,
} from "./model";
import { SUBSCRIPTION_PLAN_CODES } from "@/modules/subscriptions/model";
import { getPublishedSubscriptionCatalogue } from "@/modules/subscriptions/server";
import {
  restaurantSearchSchema,
  type RestaurantSearchInput,
  type RestaurantSearchResultDTO,
} from "@/modules/restaurants/contracts";
import { getRestaurantDiscoveryEligibility } from "@/modules/restaurants/server";
import {
  publicResidenceSearchSchema,
  type PublicResidenceSearchInput,
  type PublicResidenceSearchResultDTO,
} from "@/modules/residences/contracts";
import { getResidenceDiscoveryEligibility } from "@/modules/residences/server";
import { issueDiscoveryAttributions } from "./_internal/attribution";

export {
  getDiscoveryPerformanceRows,
  issueDiscoveryAttributions,
  recordDiscoveryClick,
  recordDiscoveryConversion,
  recordDiscoveryDetailOpen,
} from "./_internal/attribution";

export async function getDiscoveryRankingConfiguration(activityType: DiscoveryActivityType) {
  const catalogue = await getPublishedSubscriptionCatalogue();
  const benefitsByPlan = Object.fromEntries(
    SUBSCRIPTION_PLAN_CODES.map((planCode) => {
      const plan = catalogue.plans.find((candidate) => candidate.code === planCode);
      if (!plan) throw new Error(`Offre discovery absente : ${planCode}`);
      const presentation = plan.presentation[activityType];
      return [
        planCode,
        {
          exposureWeight: presentation.exposureWeight,
          searchPromotedEligible: presentation.searchPromotedEligible,
          partnerBadgeEnabled: presentation.partnerBadgeEnabled,
        },
      ];
    }),
  ) as DiscoveryPlanBenefits;

  return {
    policy: catalogue.policies[activityType],
    benefitsByPlan,
  };
}

export async function searchRestaurantsInCurrentMarket(
  input: RestaurantSearchInput,
): Promise<RestaurantSearchResultDTO> {
  const parsed = restaurantSearchSchema.parse(input);
  const [eligibility, configuration] = await Promise.all([
    getRestaurantDiscoveryEligibility(parsed),
    getDiscoveryRankingConfiguration("restaurant"),
  ]);
  const contextKey = [
    "restaurant",
    eligibility.scope,
    parsed.currentLocation.lat.toFixed(4),
    parsed.currentLocation.lng.toFixed(4),
    parsed.search ?? "",
    parsed.cuisine ?? "",
    parsed.modeCommande ?? "",
  ].join(":");
  const ranking = rankDiscoveryPage({
    candidates: eligibility.records.map((record) => record.candidate),
    ...configuration,
    context: {
      contextKey,
      page: parsed.page,
      pageSize: parsed.limit,
      at: new Date(),
    },
  });
  const records = new Map(
    eligibility.records.map((record) => [record.item.id, record]),
  );
  const tokens = await issueDiscoveryAttributions(
    ranking.items.map((ranked) => {
      const record = records.get(ranked.resourceId);
      if (!record) {
        throw new Error(`Restaurant classé introuvable : ${ranked.resourceId}`);
      }
      return {
        ...ranked,
        contextKey,
        destinationPath: `/client/restaurant/${record.item.slug}`,
      };
    }),
  );
  return {
    items: ranking.items.map((ranked) => {
      const record = records.get(ranked.resourceId);
      if (!record) {
        throw new Error(`Restaurant classé introuvable : ${ranked.resourceId}`);
      }
      return {
        ...record.item,
        placement: ranked.placement,
        partnerBadgeEnabled:
          configuration.benefitsByPlan[ranked.planCode].partnerBadgeEnabled,
        discoveryToken: tokens.get(ranked.resourceId) ?? "",
      };
    }),
    total: ranking.total,
    page: parsed.page,
    limit: parsed.limit,
    market: eligibility.market,
    capability: eligibility.capability,
    policyMode: eligibility.policyMode,
  };
}

export async function searchPublicResidences(
  input: PublicResidenceSearchInput,
): Promise<PublicResidenceSearchResultDTO> {
  const parsed = publicResidenceSearchSchema.parse(input);
  const [eligibleRecords, configuration] = await Promise.all([
    getResidenceDiscoveryEligibility(parsed),
    getDiscoveryRankingConfiguration("residence"),
  ]);
  const contextKey = [
    "residence",
    parsed.destination?.toLocaleLowerCase("fr") ?? "all",
    parsed.checkIn ?? "any-date",
    parsed.checkOut ?? "any-date",
    parsed.guests ?? "any-guests",
  ].join(":");
  const ranking = rankDiscoveryPage({
    candidates: eligibleRecords.map((record) => record.candidate),
    ...configuration,
    context: {
      contextKey,
      page: parsed.page,
      pageSize: parsed.limit,
      at: new Date(),
    },
  });
  const records = new Map(
    eligibleRecords.map((record) => [record.item.id, record]),
  );
  const tokens = await issueDiscoveryAttributions(
    ranking.items.map((ranked) => {
      const record = records.get(ranked.resourceId);
      if (!record) {
        throw new Error(`Résidence classée introuvable : ${ranked.resourceId}`);
      }
      return {
        ...ranked,
        contextKey,
        destinationPath: `/residences/${record.item.slug}`,
      };
    }),
  );
  return {
    items: ranking.items.map((ranked) => {
      const record = records.get(ranked.resourceId);
      if (!record) {
        throw new Error(`Résidence classée introuvable : ${ranked.resourceId}`);
      }
      return {
        ...record.item,
        placement: ranked.placement,
        partnerBadgeEnabled:
          configuration.benefitsByPlan[ranked.planCode].partnerBadgeEnabled,
        discoveryToken: tokens.get(ranked.resourceId) ?? "",
      };
    }),
    total: ranking.total,
    page: parsed.page,
    limit: parsed.limit,
    totalPages: ranking.totalPages,
  };
}
