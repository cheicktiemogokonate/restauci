import { z } from "zod";
import { locationSampleSchema } from "@/modules/service-markets/contracts";
import type {
  ResolvedServiceMarket,
  ServiceMarketCapabilityStatus,
} from "@/modules/service-markets/model";

export const restaurantSearchSchema = z
  .object({
    currentLocation: locationSampleSchema,
    search: z.string().trim().max(100).optional(),
    cuisine: z.string().trim().max(100).optional(),
    modeCommande: z.enum(["sur_place", "livraison", "emporter"]).optional(),
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
    legacyRadiusKm: z.number().min(0.5).max(50).default(10),
  })
  .strict();

export interface RestaurantSearchItemDTO {
  id: string;
  nom: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  banniereUrl: string | null;
  adresse: string;
  ville: string | null;
  latitude: number;
  longitude: number;
  cuisines: string[] | null;
  modesCommande: string[];
  fraisLivraison: number;
  commandeMinimum: number;
  tempsPreparationMoyen: number | null;
  noteMoyenne: number | null;
  nombreAvis: number;
  enLigne: boolean;
  accepteCommandes: boolean;
  distanceKm: number;
  placement: "promoted" | "organic";
  partnerBadgeEnabled: boolean;
  discoveryToken: string;
}

export interface RestaurantSearchResultDTO {
  items: RestaurantSearchItemDTO[];
  total: number;
  page: number;
  limit: number;
  market: ResolvedServiceMarket | null;
  capability: {
    activityType: "restaurant";
    status: ServiceMarketCapabilityStatus;
  } | null;
  policyMode: "off" | "shadow" | "enforce";
}

export const restaurantLocationSchema = z
  .object({
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
  })
  .strict();

export const changeRestaurantLocationSchema = restaurantLocationSchema.extend({
  restaurantId: z.string().min(1).max(36),
  adresse: z.string().trim().min(5).max(500),
  pays: z.string().trim().min(2).max(100).optional(),
});

export type RestaurantSearchInput = z.infer<typeof restaurantSearchSchema>;
export type RestaurantLocationInput = z.infer<typeof restaurantLocationSchema>;
export type ChangeRestaurantLocationInput = z.infer<
  typeof changeRestaurantLocationSchema
>;
