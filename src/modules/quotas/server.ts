import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  subscriptionPeriodLimits,
  subscriptionPlanLimits,
} from "@/lib/db/schema";
import type { DbExecutor } from "@/lib/db/transaction";
import { getEffectiveSubscriptionContext } from "@/modules/subscriptions/server";
import {
  selectResidenceQuotaEligibleResources,
  type ResidencePublicationCandidate,
} from "./model";

export async function getEffectiveResidenceQuota(
  partnerAccountId: string,
  options: { executor?: DbExecutor; now?: Date } = {},
) {
  const executor = options.executor ?? db;
  const subscription = await getEffectiveSubscriptionContext(
    partnerAccountId,
    options,
  );
  if (subscription.activityType !== "residence") {
    throw new Error("Le compte partenaire n’est pas une activité Résidence");
  }

  const rows = subscription.period
    ? await executor
        .select({ maxCount: subscriptionPeriodLimits.maxCount })
        .from(subscriptionPeriodLimits)
        .where(
          and(
            eq(
              subscriptionPeriodLimits.subscriptionPeriodId,
              subscription.period.id,
            ),
            eq(subscriptionPeriodLimits.activityType, "residence"),
            eq(subscriptionPeriodLimits.resourceType, "residence"),
          ),
        )
    : await executor
        .select({ maxCount: subscriptionPlanLimits.maxCount })
        .from(subscriptionPlanLimits)
        .where(
          and(
            eq(subscriptionPlanLimits.planId, subscription.plan.id),
            eq(subscriptionPlanLimits.activityType, "residence"),
            eq(subscriptionPlanLimits.resourceType, "residence"),
          ),
        );

  if (rows.length !== 1) {
    throw new Error(
      `Configuration du quota Résidence incomplète pour ${subscription.period ? `la période ${subscription.period.id}` : `l'offre ${subscription.plan.code}`}`,
    );
  }

  return {
    source: subscription.period ? ("period" as const) : ("catalog" as const),
    planCode: subscription.plan.code,
    periodId: subscription.period?.id ?? null,
    maxPublicResidences: rows[0]!.maxCount,
  };
}

export async function getResidenceQuotaEligibility(
  partnerAccountId: string,
  residences: ResidencePublicationCandidate[],
  options: { executor?: DbExecutor; now?: Date } = {},
) {
  const entitlement = await getEffectiveResidenceQuota(
    partnerAccountId,
    options,
  );
  return {
    ...entitlement,
    ...selectResidenceQuotaEligibleResources(
      residences,
      entitlement.maxPublicResidences,
    ),
  };
}
