import { z } from "zod";
import { locationSampleSchema } from "@/shared/geo";

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

export const moodSchema = z.enum([
  "calme_discret",
  "entre_amis",
  "belle_vue",
  "coup_de_coeur",
]);
export type MoodType = z.infer<typeof moodSchema>;

export const etablissementSearchSchema = z
  .object({
    currentLocation: locationSampleSchema,
    type: z.enum(["tous", "restaurant", "residence"]).default("tous"),
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(50),
    radiusKm: z.number().min(0.5).max(200).default(50),
    search: z.string().trim().max(100).optional(),
  })
  .strict();

export type EtablissementSearchInput = z.infer<typeof etablissementSearchSchema>;

export const moodSearchSchema = z
  .object({
    currentLocation: locationSampleSchema,
    query: z.string().trim().max(100).optional(),
    mood: moodSchema.optional(),
    type: z.enum(["tous", "restaurant", "residence"]).default("tous"),
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(50).default(20),
    radiusKm: z.number().min(0.5).max(200).default(50),
  })
  .strict();

export type MoodSearchInput = z.infer<typeof moodSearchSchema>;

export interface EtablissementItemDTO {
  id: string;
  type: "restaurant" | "residence";
  nom: string;
  slug: string;
  description: string | null;
  adresse: string;
  ville: string | null;
  latitude: number;
  longitude: number;
  distanceKm: number;
  imageUrl: string | null;
  banniereUrl?: string | null;
  noteMoyenne: number | null;
  nombreAvis: number;
  enLigne: boolean;
  prixAffiche: string | null;
  prixFcfa: number | null;
  tags: string[];
  placement: "promoted" | "organic";
  partnerBadgeEnabled: boolean;
  discoveryToken: string;
}

export interface EtablissementSearchResultDTO {
  items: EtablissementItemDTO[];
  total: number;
  page: number;
  limit: number;
}
