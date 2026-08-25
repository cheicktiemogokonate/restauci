import { z } from "zod";

export const discoveryAttributionTokenPayloadSchema = z
  .object({
    version: z.literal(1),
    attributionId: z.string().uuid(),
    activityType: z.enum(["restaurant", "residence"]),
    resourceId: z.string().min(1).max(36),
    partnerAccountId: z.string().uuid(),
    planCode: z.enum(["decouverte", "croissance", "partenaire_fier"]),
    placement: z.enum(["promoted", "organic"]),
    contextHash: z.string().regex(/^[a-f0-9]{64}$/),
    destinationPath: z
      .string()
      .max(300)
      .refine(
        (value) =>
          value.startsWith("/residences/") ||
          value.startsWith("/client/restaurant/"),
        "Destination discovery invalide.",
      ),
    expiresAt: z.number().int().positive(),
  })
  .strict();

export const recordDiscoveryEventSchema = z
  .object({
    token: z.string().min(20).max(2_000),
    eventType: z.enum(["detail_open"]),
  })
  .strict();

export const discoveryRankingContextSchema = z
  .object({
    contextKey: z.string().trim().min(1).max(500),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1).max(100),
    at: z.date(),
  })
  .strict();
