import { z } from "zod";
import {
  OFFLINE_SUBSCRIPTION_PAYMENT_METHODS,
  SUBSCRIPTION_ACTIVITY_TYPES,
  SUBSCRIPTION_PLAN_CODES,
} from "./model";

const catalogueLimitSchema = z.number().int().min(0).nullable();

export const subscriptionPlanCodeSchema = z.enum(SUBSCRIPTION_PLAN_CODES);
export const subscriptionCatalogueRevisionIdSchema = z.uuid();
export const subscriptionActivityTypeSchema = z.enum(
  SUBSCRIPTION_ACTIVITY_TYPES,
);

const subscriptionPlanPresentationSchema = z
  .object({
    exposureWeight: z.number().int().min(1).max(100),
    searchPromotedEligible: z.boolean(),
    marketFeaturedEligible: z.boolean(),
    homepageFeaturedEligible: z.boolean(),
    partnerBadgeEnabled: z.boolean(),
    recommended: z.boolean(),
    ctaLabel: z.string().trim().min(2).max(80),
    features: z.array(z.string().trim().min(2).max(160)).max(12),
  })
  .strict();

const subscriptionCataloguePlanSchema = z
  .object({
    code: subscriptionPlanCodeSchema,
    nom: z.string().trim().min(2).max(100),
    description: z.string().trim().max(2_000).nullable(),
    prixAnnuelFcfa: z.number().int().min(0),
    tauxCommissionBps: z.number().int().min(0).max(10_000),
    restaurantLimits: z
      .object({ category: catalogueLimitSchema, dish: catalogueLimitSchema })
      .strict(),
    residenceLimits: z
      .object({ residence: catalogueLimitSchema })
      .strict(),
    ordre: z.number().int().min(0),
    actif: z.boolean(),
    presentation: z
      .object({
        restaurant: subscriptionPlanPresentationSchema,
        residence: subscriptionPlanPresentationSchema,
      })
      .strict(),
  })
  .strict();

const discoveryPolicySchema = z
  .object({
    enabled: z.boolean(),
    sponsoredShareBps: z.number().int().min(0).max(5_000),
    rotationWindowMinutes: z.number().int().min(15).max(10_080),
    maxPromotedPerPartner: z.number().int().min(1).max(10),
  })
  .strict();

export const subscriptionCataloguePayloadSchema = z
  .object({
    schemaVersion: z.literal(1),
    plans: z.array(subscriptionCataloguePlanSchema).length(3),
    policies: z
      .object({
        restaurant: discoveryPolicySchema,
        residence: discoveryPolicySchema,
      })
      .strict(),
  })
  .strict()
  .superRefine((payload, context) => {
    const byCode = new Map(payload.plans.map((plan) => [plan.code, plan]));
    if (
      byCode.size !== SUBSCRIPTION_PLAN_CODES.length ||
      SUBSCRIPTION_PLAN_CODES.some((code) => !byCode.has(code))
    ) {
      context.addIssue({
        code: "custom",
        path: ["plans"],
        message: "Les trois offres Toutci doivent être configurées exactement une fois.",
      });
      return;
    }

    const orders = new Set(payload.plans.map((plan) => plan.ordre));
    if (orders.size !== payload.plans.length) {
      context.addIssue({
        code: "custom",
        path: ["plans"],
        message: "Chaque offre doit avoir un ordre d’affichage distinct.",
      });
    }

    for (const activityType of SUBSCRIPTION_ACTIVITY_TYPES) {
      const discovery = byCode.get("decouverte")!.presentation[activityType];
      const growth = byCode.get("croissance")!.presentation[activityType];
      const proud = byCode.get("partenaire_fier")!.presentation[activityType];

      if (
        !(discovery.exposureWeight < growth.exposureWeight) ||
        !(growth.exposureWeight < proud.exposureWeight)
      ) {
        context.addIssue({
          code: "custom",
          path: ["plans"],
          message: `L’exposition ${activityType} doit respecter Découverte < Croissance < Partenaire Fier.`,
        });
      }
      if (
        discovery.searchPromotedEligible ||
        discovery.marketFeaturedEligible ||
        discovery.homepageFeaturedEligible ||
        discovery.partnerBadgeEnabled
      ) {
        context.addIssue({
          code: "custom",
          path: ["plans"],
          message: `L’offre Découverte ne peut pas activer un emplacement payant pour ${activityType}.`,
        });
      }
      const capabilities = [
        "searchPromotedEligible",
        "marketFeaturedEligible",
        "homepageFeaturedEligible",
        "partnerBadgeEnabled",
      ] as const;
      for (const capability of capabilities) {
        if (growth[capability] && !proud[capability]) {
          context.addIssue({
            code: "custom",
            path: ["plans"],
            message: `Partenaire Fier doit conserver l’avantage ${capability} accordé à Croissance pour ${activityType}.`,
          });
        }
      }
      const recommendedCount = [discovery, growth, proud].filter(
        (presentation) => presentation.recommended,
      ).length;
      if (recommendedCount > 1) {
        context.addIssue({
          code: "custom",
          path: ["plans"],
          message: `Une seule offre ${activityType} peut être recommandée.`,
        });
      }
    }
  });

export const partnerSubscriptionRequestSchema = z.object({
  partnerAccountId: z.uuid(),
  planCode: subscriptionPlanCodeSchema,
});

export const effectiveSubscriptionSummaryListSchema = z
  .array(z.uuid())
  .max(100);

export interface EffectiveSubscriptionSummaryDTO {
  partnerAccountId: string;
  plan: {
    code: z.infer<typeof subscriptionPlanCodeSchema>;
    name: string;
    rateBps: number;
  };
  period: {
    status: string;
    expiresAt: string | null;
  } | null;
}

export const validateOfflineSubscriptionRequestSchema = z
  .object({
    requestId: z.uuid(),
    paymentMethod: z.enum(OFFLINE_SUBSCRIPTION_PAYMENT_METHODS).optional(),
    paymentReference: z.string().trim().min(3).max(255).optional(),
  })
  .strict();

export const updateSubscriptionCatalogueSchema = z
  .object({
    nom: z.string().trim().min(2).max(100).optional(),
    description: z.string().trim().max(2_000).nullable().optional(),
    prixAnnuelFcfa: z.number().int().min(0).optional(),
    tauxCommissionBps: z.number().int().min(0).max(10_000).optional(),
    restaurantLimits: z
      .object({
        dish: catalogueLimitSchema,
        category: catalogueLimitSchema,
      })
      .strict()
      .optional(),
    residenceLimits: z
      .object({ residence: catalogueLimitSchema })
      .strict()
      .optional(),
    ordre: z.number().int().min(0).optional(),
    actif: z.boolean().optional(),
  })
  .strict();

export type UpdateSubscriptionCatalogueInput = z.infer<
  typeof updateSubscriptionCatalogueSchema
>;

export type { SubscriptionCataloguePayload } from "./model";

export type PartnerSubscriptionRequestInput = z.infer<
  typeof partnerSubscriptionRequestSchema
>;

export type ValidateOfflineSubscriptionRequestInput = z.infer<
  typeof validateOfflineSubscriptionRequestSchema
>;
