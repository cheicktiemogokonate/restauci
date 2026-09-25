import { z } from "zod";
import { locationSampleSchema } from "@/shared/geo";

interface RestaurantResolvedServiceMarketDTO {
  id: string;
  code: string;
  name: string;
  countryCode: string;
  versionId: string;
  version: number;
}

type RestaurantServiceMarketCapabilityStatus =
  | "disabled"
  | "prelaunch"
  | "active"
  | "paused";

export const restaurantMoodSchema = z.enum([
  "calme_discret",
  "entre_amis",
  "belle_vue",
  "coup_de_coeur",
]);
export type RestaurantMood = z.infer<typeof restaurantMoodSchema>;

export const restaurantSearchSchema = z
  .object({
    currentLocation: locationSampleSchema,
    query: z.string().trim().max(100).optional(),
    mood: restaurantMoodSchema.optional(),
    cuisine: z.string().trim().max(100).optional(),
    modeCommande: z.enum(["sur_place", "livraison", "emporter"]).optional(),
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
    legacyRadiusKm: z.number().min(0.5).max(200).default(50),
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
  market: RestaurantResolvedServiceMarketDTO | null;
  capability: {
    activityType: "restaurant";
    status: RestaurantServiceMarketCapabilityStatus;
  } | null;
  policyMode: "off" | "shadow" | "enforce";
}

/** Candidat déjà filtré par les règles Restaurants, avant classement Discovery. */
export interface RestaurantDiscoveryEligibleRecord {
  item: Omit<
    RestaurantSearchItemDTO,
    "placement" | "partnerBadgeEnabled" | "discoveryToken"
  >;
  candidate: {
    resourceId: string;
    partnerAccountId: string;
    planCode: "decouverte" | "croissance" | "partenaire_fier";
    organicRank: number;
  };
}

export interface RestaurantDiscoveryEligibilityDTO {
  records: RestaurantDiscoveryEligibleRecord[];
  scope: string;
  market: RestaurantResolvedServiceMarketDTO | null;
  capability: {
    activityType: "restaurant";
    status: RestaurantServiceMarketCapabilityStatus;
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

export interface CreateRestaurantInput {
  partnerAccountId: string;
  nom: string;
  description?: string;
  telephone: string;
  email?: string;
  siteWeb?: string;
  adresse: string;
  ville?: string;
  pays?: string;
  latitude: number;
  longitude: number;
  logoUrl?: string;
  logoAssetId?: string;
  banniereUrl?: string;
  banniereAssetId?: string;
  fraisLivraison?: number;
  commandeMinimum?: number;
  modesCommande?: string[];
  cuisines?: string[];
  facebook?: string;
  instagram?: string;
  whatsapp?: string;
  schedule?: Array<{
    nom: string;
    heureOuverture: string;
    heureFermeture: string;
    joursActifs: string[];
  }>;
  menu?: Array<{
    nom: string;
    description?: string;
    prix: number;
    categorie: string;
    photoUrl?: string;
    photoAssetId?: string;
  }>;
}

export interface AdminRestaurantAccountSummaryDTO {
  id: string;
  name: string;
  active: boolean;
  suspended: boolean;
  rejectionReason: string | null;
}

export const restaurantUpdateSchema = z
  .object({
    nom: z.string().trim().min(2).max(255).optional(),
    description: z.string().trim().max(2_000).nullable().optional(),
    adresse: z.string().trim().min(5).max(500).optional(),
    telephone: z.string().trim().min(10).max(20).optional(),
    latitude: z.number().finite().min(-90).max(90).optional(),
    longitude: z.number().finite().min(-180).max(180).optional(),
    fraisLivraison: z.number().int().nonnegative().optional(),
    commandeMinimum: z.number().int().nonnegative().optional(),
    modesCommande: z
      .array(z.enum(["sur_place", "livraison", "emporter"]))
      .min(1)
      .optional(),
    cuisines: z.array(z.string().trim().min(1).max(100)).max(30).optional(),
    logoUrl: z.string().url().nullable().optional(),
    banniereUrl: z.string().url().nullable().optional(),
    facebook: z.string().trim().max(500).nullable().optional(),
    instagram: z.string().trim().max(500).nullable().optional(),
    whatsapp: z.string().trim().max(50).nullable().optional(),
    pays: z.string().trim().max(100).optional(),
    ville: z.string().trim().max(100).optional(),
    email: z.string().email().nullable().optional(),
    siteWeb: z.string().url().nullable().optional(),
    tempsPreparationMoyen: z.number().int().nonnegative().optional(),
  })
  .strict();

export const restaurantCreationSchema = z.object({
  nom: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères"),
  description: z.string().trim().max(2_000).optional(),
  adresse: z.string().trim().min(5, "L'adresse doit être valide"),
  telephone: z.string().trim().min(10, "Le téléphone doit être valide"),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  fraisLivraison: z.number().int().nonnegative().default(0),
  commandeMinimum: z.number().int().nonnegative().default(0),
  modesCommande: z
    .array(z.enum(["sur_place", "livraison", "emporter"]))
    .min(1, "Au moins un mode de commande requis"),
  cuisines: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
  logoUrl: z.string().url("URL du logo invalide").optional(),
  banniereUrl: z.string().url().optional(),
  facebook: z.string().trim().max(500).optional().or(z.literal("")),
  instagram: z.string().trim().max(500).optional().or(z.literal("")),
  whatsapp: z.string().trim().max(50).optional().or(z.literal("")),
  pays: z.string().trim().max(100).optional(),
  ville: z.string().trim().max(100).optional(),
  email: z.string().email().optional().or(z.literal("")),
  siteWeb: z.string().url().optional().or(z.literal("")),
  tempsPreparationMoyen: z.number().int().nonnegative().default(20),
});

export const adminRestaurantStatusSchema = z.enum([
  "en_attente",
  "actif",
  "suspendu",
  "rejete",
  "tous",
]);

export const adminRestaurantListSchema = z
  .object({
    statut: adminRestaurantStatusSchema.default("tous"),
    search: z.string().trim().max(100).optional(),
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
  })
  .strict();

export const adminRestaurantIdSchema = z.uuid();
export const adminRestaurantTransitionReasonSchema = z
  .string()
  .trim()
  .min(5)
  .max(1_000);

export type AdminRestaurantListInput = z.input<
  typeof adminRestaurantListSchema
>;

export interface AdminRestaurantListItemDTO {
  id: string;
  partnerAccountId: string;
  nom: string;
  slug: string;
  telephone: string;
  ville: string | null;
  actif: boolean;
  suspendu: boolean;
  motifRejet: string | null;
  enLigne: boolean;
  nombreCommandes: number;
  noteMoyenne: number | null;
  createdAt: string;
}

export interface AdminRestaurantCountsDTO {
  enAttente: number;
  actifs: number;
  suspendus: number;
  rejetes: number;
  total: number;
}

export interface AdminRestaurantDetailDTO {
  id: string;
  partnerAccountId: string;
  nom: string;
  adresse: string;
  telephone: string;
  actif: boolean;
  suspendu: boolean;
  motifRejet: string | null;
  motifSuspension: string | null;
  nombreCommandes: number;
  noteMoyenne: number | null;
  createdAt: string;
  proprietaire: {
    nom: string;
    email: string;
    telephone: string;
  } | null;
}

export const openingHoursSchema = z
  .object({
    id: z.string().uuid().optional(),
    nom: z.string().trim().min(2, "Donnez un nom à ce créneau.").max(255),
    heureOuverture: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure d'ouverture invalide."),
    heureFermeture: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure de fermeture invalide."),
    joursActifs: z
      .array(z.enum(["lun", "mar", "mer", "jeu", "ven", "sam", "dim"]))
      .min(1, "Choisissez au moins un jour."),
    actif: z.boolean(),
  })
  .strict();

export type RestaurantUpdateInput = z.infer<typeof restaurantUpdateSchema>;
export type OpeningHoursInput = z.infer<typeof openingHoursSchema>;

export interface PartnerRestaurantDTO {
  id: string;
  partnerAccountId: string;
  nom: string;
  slug: string;
  description: string | null;
  telephone: string;
  email: string | null;
  siteWeb: string | null;
  adresse: string;
  ville: string | null;
  pays: string | null;
  latitude: number;
  longitude: number;
  logoUrl: string | null;
  banniereUrl: string | null;
  fraisLivraison: number;
  commandeMinimum: number;
  modesCommande: string[];
  cuisines: string[];
  actif: boolean;
  enLigne: boolean;
  accepteCommandes: boolean;
  tempsPreparationMoyen: number;
  facebook: string | null;
  instagram: string | null;
  whatsapp: string | null;
  motifRejet: string | null;
  suspendu: boolean;
  motifSuspension: string | null;
}

export interface PublicRestaurantDTO {
  id: string;
  slug: string;
  nom: string;
  description: string | null;
  telephone: string;
  email: string | null;
  siteWeb: string | null;
  adresse: string;
  ville: string | null;
  pays: string | null;
  latitude: number;
  longitude: number;
  logoUrl: string | null;
  banniereUrl: string | null;
  fraisLivraison: number;
  commandeMinimum: number;
  modesCommande: string[];
  cuisines: string[];
  enLigne: boolean;
  accepteCommandes: boolean;
  tempsPreparationMoyen: number;
  noteMoyenne: number;
  nombreAvis: number;
  facebook: string | null;
  instagram: string | null;
  whatsapp: string | null;
}

export interface RestaurantScheduleDTO {
  id: string;
  restaurantId: string;
  nom: string;
  heureOuverture: string;
  heureFermeture: string;
  joursActifs: string[];
  actif: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RestaurantOrderContextDTO {
  id: string;
  partnerAccountId: string;
  notificationUserId: string;
  actif: boolean;
  suspendu: boolean;
  enLigne: boolean;
  accepteCommandes: boolean;
  modesCommande: string[];
  fraisLivraison: number;
  commandeMinimum: number;
  serviceMarketId: string | null;
  serviceMarketVersionId: string | null;
  ownerIdentityStatus: "not_submitted" | "pending" | "verified" | "rejected";
}

export type ServiceTypeInput =
  | "dine-in"
  | "takeout"
  | "delivery"
  | "sur_place"
  | "livraison"
  | "emporter";

export interface RestaurantOnboardingData {
  nom: string;
  telephone: string;
  adresse: string;
  latitude: number;
  longitude: number;
  modesCommande: ServiceTypeInput[];
  establishmentType: "restaurant" | "residence" | "event";
  cuisines?: string[];
  description?: string;
  logoUrl?: string;
  logoAssetId?: string;
  banniereUrl?: string;
  banniereAssetId?: string;
  pays?: string;
  ville?: string;
  email?: string;
  siteWeb?: string;
  whatsapp?: string;
  facebook?: string;
  schedule: Array<{
    day: string;
    isOpen: boolean;
    openTime: string;
    closeTime: string;
  }>;
  menu: Array<{
    name: string;
    description: string;
    price: number;
    category: string;
    photoUrl?: string | null;
    photoAssetId?: string | null;
  }>;
}
