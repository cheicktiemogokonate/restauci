import "server-only";

import { and, asc, desc, eq, sql } from "drizzle-orm";
import { persistAuditLog } from "@/modules/audit/server";
import { db } from "@/infrastructure/db";
import {
  discoveryPolicySettings,
  subscriptionCatalogueDraft,
  subscriptionCatalogueRevisions,
  subscriptionPlanExposureBenefits,
  subscriptionPlanFeatureItems,
  subscriptionPlanLimits,
  subscriptionPlans,
} from "@/infrastructure/db/schema";
import {
  transactionalDb,
  type DbExecutor,
} from "@/infrastructure/db/transaction";
import {
  subscriptionCataloguePayloadSchema,
  type SubscriptionCataloguePayload,
} from "../contracts";
import {
  SUBSCRIPTION_ACTIVITY_TYPES,
  SUBSCRIPTION_PLAN_CODES,
  type SubscriptionActivityType,
} from "../model";

function getLimit(
  limits: {
    activityType: "restaurant" | "residence";
    resourceType: "category" | "dish" | "residence";
    maxCount: number | null;
  }[],
  activityType: "restaurant" | "residence",
  resourceType: "category" | "dish" | "residence",
) {
  const limit = limits.find(
    (candidate) =>
      candidate.activityType === activityType &&
      candidate.resourceType === resourceType,
  );
  if (!limit) {
    throw new Error(
      `Catalogue incomplet : limite ${activityType}/${resourceType} absente.`,
    );
  }
  return limit.maxCount;
}

function getPresentation(
  plan: {
    exposureBenefits: {
      activityType: "restaurant" | "residence";
      exposureWeight: number;
      searchPromotedEligible: boolean;
      marketFeaturedEligible: boolean;
      homepageFeaturedEligible: boolean;
      partnerBadgeEnabled: boolean;
      recommended: boolean;
      ctaLabel: string;
    }[];
    featureItems: {
      activityType: "restaurant" | "residence";
      label: string;
      sortOrder: number;
    }[];
  },
  activityType: SubscriptionActivityType,
) {
  const benefit = plan.exposureBenefits.find(
    (candidate) => candidate.activityType === activityType,
  );
  if (!benefit) {
    throw new Error(
      `Catalogue incomplet : exposition ${activityType} absente.`,
    );
  }
  return {
    exposureWeight: benefit.exposureWeight,
    searchPromotedEligible: benefit.searchPromotedEligible,
    marketFeaturedEligible: benefit.marketFeaturedEligible,
    homepageFeaturedEligible: benefit.homepageFeaturedEligible,
    partnerBadgeEnabled: benefit.partnerBadgeEnabled,
    recommended: benefit.recommended,
    ctaLabel: benefit.ctaLabel,
    features: plan.featureItems
      .filter((feature) => feature.activityType === activityType)
      .sort((first, second) => first.sortOrder - second.sortOrder)
      .map((feature) => feature.label),
  };
}

export async function getCurrentSubscriptionCataloguePayloadRecord(
  executor: DbExecutor = db,
): Promise<SubscriptionCataloguePayload> {
  const [plans, policies] = await Promise.all([
    executor.query.subscriptionPlans.findMany({
      orderBy: [asc(subscriptionPlans.ordre)],
      with: {
        limits: true,
        exposureBenefits: true,
        featureItems: {
          orderBy: [asc(subscriptionPlanFeatureItems.sortOrder)],
        },
      },
    }),
    executor.query.discoveryPolicySettings.findMany({
      orderBy: [asc(discoveryPolicySettings.activityType)],
    }),
  ]);
  const planByCode = new Map(plans.map((plan) => [plan.code, plan]));
  const policyByActivity = new Map(
    policies.map((policy) => [policy.activityType, policy]),
  );

  return subscriptionCataloguePayloadSchema.parse({
    schemaVersion: 1,
    plans: SUBSCRIPTION_PLAN_CODES.map((code) => {
      const plan = planByCode.get(code);
      if (!plan) throw new Error(`Catalogue incomplet : offre ${code} absente.`);
      return {
        code,
        nom: plan.nom,
        description: plan.description,
        prixAnnuelFcfa: plan.prixAnnuelFcfa,
        tauxCommissionBps: plan.tauxCommissionBps,
        restaurantLimits: {
          category: getLimit(plan.limits, "restaurant", "category"),
          dish: getLimit(plan.limits, "restaurant", "dish"),
        },
        residenceLimits: {
          residence: getLimit(plan.limits, "residence", "residence"),
        },
        ordre: plan.ordre,
        actif: plan.actif,
        presentation: {
          restaurant: getPresentation(plan, "restaurant"),
          residence: getPresentation(plan, "residence"),
        },
      };
    }),
    policies: Object.fromEntries(
      SUBSCRIPTION_ACTIVITY_TYPES.map((activityType) => {
        const policy = policyByActivity.get(activityType);
        if (!policy) {
          throw new Error(
            `Catalogue incomplet : politique ${activityType} absente.`,
          );
        }
        return [
          activityType,
          {
            enabled: policy.enabled,
            sponsoredShareBps: policy.sponsoredShareBps,
            rotationWindowMinutes: policy.rotationWindowMinutes,
            maxPromotedPerPartner: policy.maxPromotedPerPartner,
          },
        ];
      }),
    ),
  });
}

export async function getAdminSubscriptionCatalogueWorkspaceRecord() {
  const [current, draft, revisions] = await Promise.all([
    getCurrentSubscriptionCataloguePayloadRecord(),
    db.query.subscriptionCatalogueDraft.findFirst({
      where: eq(subscriptionCatalogueDraft.id, 1),
    }),
    db.query.subscriptionCatalogueRevisions.findMany({
      orderBy: [desc(subscriptionCatalogueRevisions.version)],
      limit: 20,
    }),
  ]);
  return {
    current,
    draft: draft
      ? subscriptionCataloguePayloadSchema.parse(draft.payload)
      : current,
    draftMeta: draft
      ? {
          updatedByAdminId: draft.updatedByAdminId,
          updatedAt: draft.updatedAt.toISOString(),
        }
      : null,
    revisions: revisions.map((revision) => ({
      id: revision.id,
      version: revision.version,
      publishedByAdminId: revision.publishedByAdminId,
      publishedAt: revision.publishedAt.toISOString(),
    })),
  };
}

export async function saveSubscriptionCatalogueDraftRecord(
  adminId: string,
  input: SubscriptionCataloguePayload,
) {
  const payload = subscriptionCataloguePayloadSchema.parse(input);
  const now = new Date();
  await transactionalDb
    .insert(subscriptionCatalogueDraft)
    .values({ id: 1, payload, updatedByAdminId: adminId, updatedAt: now })
    .onConflictDoUpdate({
      target: subscriptionCatalogueDraft.id,
      set: { payload, updatedByAdminId: adminId, updatedAt: now },
    });
  return { updatedAt: now.toISOString() };
}

async function upsertLimit(
  tx: Parameters<Parameters<typeof transactionalDb.transaction>[0]>[0],
  input: {
    planId: string;
    activityType: SubscriptionActivityType;
    resourceType: "category" | "dish" | "residence";
    maxCount: number | null;
    now: Date;
  },
) {
  await tx
    .insert(subscriptionPlanLimits)
    .values(input)
    .onConflictDoUpdate({
      target: [
        subscriptionPlanLimits.planId,
        subscriptionPlanLimits.activityType,
        subscriptionPlanLimits.resourceType,
      ],
      set: { maxCount: input.maxCount, updatedAt: input.now },
    });
}

export async function publishSubscriptionCatalogueDraftRecord(adminId: string) {
  return transactionalDb.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT id FROM ${subscriptionCatalogueDraft} WHERE id = 1 FOR UPDATE`,
    );
    const draft = await tx.query.subscriptionCatalogueDraft.findFirst({
      where: eq(subscriptionCatalogueDraft.id, 1),
    });
    if (!draft) throw new Error("Aucun brouillon de catalogue à publier.");
    const payload = subscriptionCataloguePayloadSchema.parse(draft.payload);
    await tx.execute(
      sql`SELECT id FROM ${subscriptionPlans} ORDER BY id FOR UPDATE`,
    );
    const plans = await tx.query.subscriptionPlans.findMany();
    const planIdByCode = new Map(plans.map((plan) => [plan.code, plan.id]));
    const now = new Date();

    for (const plan of payload.plans) {
      const planId = planIdByCode.get(plan.code);
      if (!planId) throw new Error(`Offre ${plan.code} introuvable.`);
      await tx
        .update(subscriptionPlans)
        .set({
          nom: plan.nom,
          description: plan.description,
          prixAnnuelFcfa: plan.prixAnnuelFcfa,
          tauxCommissionBps: plan.tauxCommissionBps,
          ordre: plan.ordre,
          actif: plan.actif,
          updatedByAdminId: adminId,
          updatedAt: now,
        })
        .where(eq(subscriptionPlans.id, planId));

      await Promise.all([
        upsertLimit(tx, {
          planId,
          activityType: "restaurant",
          resourceType: "category",
          maxCount: plan.restaurantLimits.category,
          now,
        }),
        upsertLimit(tx, {
          planId,
          activityType: "restaurant",
          resourceType: "dish",
          maxCount: plan.restaurantLimits.dish,
          now,
        }),
        upsertLimit(tx, {
          planId,
          activityType: "residence",
          resourceType: "residence",
          maxCount: plan.residenceLimits.residence,
          now,
        }),
      ]);

      for (const activityType of SUBSCRIPTION_ACTIVITY_TYPES) {
        const presentation = plan.presentation[activityType];
        await tx
          .insert(subscriptionPlanExposureBenefits)
          .values({
            planId,
            activityType,
            exposureWeight: presentation.exposureWeight,
            searchPromotedEligible: presentation.searchPromotedEligible,
            marketFeaturedEligible: presentation.marketFeaturedEligible,
            homepageFeaturedEligible: presentation.homepageFeaturedEligible,
            partnerBadgeEnabled: presentation.partnerBadgeEnabled,
            recommended: presentation.recommended,
            ctaLabel: presentation.ctaLabel,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [
              subscriptionPlanExposureBenefits.planId,
              subscriptionPlanExposureBenefits.activityType,
            ],
            set: {
              exposureWeight: presentation.exposureWeight,
              searchPromotedEligible: presentation.searchPromotedEligible,
              marketFeaturedEligible: presentation.marketFeaturedEligible,
              homepageFeaturedEligible: presentation.homepageFeaturedEligible,
              partnerBadgeEnabled: presentation.partnerBadgeEnabled,
              recommended: presentation.recommended,
              ctaLabel: presentation.ctaLabel,
              updatedAt: now,
            },
          });
        await tx
          .delete(subscriptionPlanFeatureItems)
          .where(
            and(
              eq(subscriptionPlanFeatureItems.planId, planId),
              eq(subscriptionPlanFeatureItems.activityType, activityType),
            ),
          );
        if (presentation.features.length > 0) {
          await tx.insert(subscriptionPlanFeatureItems).values(
            presentation.features.map((label, sortOrder) => ({
              planId,
              activityType,
              label,
              sortOrder,
              createdAt: now,
              updatedAt: now,
            })),
          );
        }
      }
    }

    for (const activityType of SUBSCRIPTION_ACTIVITY_TYPES) {
      const policy = payload.policies[activityType];
      await tx
        .insert(discoveryPolicySettings)
        .values({
          activityType,
          ...policy,
          updatedByAdminId: adminId,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: discoveryPolicySettings.activityType,
          set: { ...policy, updatedByAdminId: adminId, updatedAt: now },
        });
    }

    const [revision] = await tx
      .insert(subscriptionCatalogueRevisions)
      .values({ payload, publishedByAdminId: adminId, publishedAt: now })
      .returning({
        id: subscriptionCatalogueRevisions.id,
        version: subscriptionCatalogueRevisions.version,
      });
    if (!revision) throw new Error("Révision de catalogue non créée.");
    await persistAuditLog(tx, {
      adminId,
      action: "catalogue_modifie",
      ressourceType: "subscription_catalogue_revision",
      ressourceId: revision.id,
      details: {
        version: revision.version,
        planCodes: payload.plans.map((plan) => plan.code),
        activities: [...SUBSCRIPTION_ACTIVITY_TYPES],
      },
    });
    await tx
      .delete(subscriptionCatalogueDraft)
      .where(eq(subscriptionCatalogueDraft.id, 1));
    return { ...revision, publishedAt: now.toISOString() };
  });
}

export async function restoreSubscriptionCatalogueRevisionToDraftRecord(
  adminId: string,
  revisionId: string,
) {
  const revision = await db.query.subscriptionCatalogueRevisions.findFirst({
    where: eq(subscriptionCatalogueRevisions.id, revisionId),
  });
  if (!revision) throw new Error("Révision de catalogue introuvable.");
  return saveSubscriptionCatalogueDraftRecord(
    adminId,
    subscriptionCataloguePayloadSchema.parse(revision.payload),
  );
}
