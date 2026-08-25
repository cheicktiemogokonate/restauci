import "server-only";

import type {
  DiscoveryActivityType,
  DiscoveryPlanBenefits,
} from "./model";
import { SUBSCRIPTION_PLAN_CODES } from "@/modules/subscriptions/model";
import { getPublishedSubscriptionCatalogue } from "@/modules/subscriptions/server";

export { rankDiscoveryPage } from "./ranking";
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
