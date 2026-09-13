import "server-only";

import {
  getServiceMarketCapability,
  resolveServiceMarketAtPoint,
} from "@/modules/service-markets/server";
import {
  restaurantLocationSchema,
  restaurantSearchSchema,
  changeRestaurantLocationSchema,
  adminRestaurantIdSchema,
  adminRestaurantListSchema,
  adminRestaurantTransitionReasonSchema,
  type AdminRestaurantListInput,
  type ChangeRestaurantLocationInput,
  type CreateRestaurantInput,
  type RestaurantLocationInput,
  type RestaurantSearchInput,
  type RestaurantDiscoveryEligibilityDTO,
} from "./contracts";
import { env } from "@/infrastructure/env";
import { RestaurantMarketError } from "./model";
import { prepareRestaurantMarketAssignment } from "./_internal/location";
import { changeRestaurantLocationInternal } from "./_internal/change-location";
import {
  searchVisibleRestaurantsInMarket,
  searchVisibleRestaurantsLegacy,
} from "./_internal/search";
import { getRestaurantAccessRecordByPartnerAccountId } from "./_internal/access";
import { createRestaurantRecord } from "./_internal/create";
import {
  getPartnerRestaurantRecord,
  getPublicRestaurantRecordBySlug,
  getRestaurantOrderCandidateRecordBySlug,
  getRestaurantOrderContextRecord,
  getRestaurantOrderDisplayRecord,
  listPublicRestaurantSitemapRecords,
  lockRestaurantOrderRecord,
} from "./_internal/access";
import {
  getRestaurantDashboardStatsRecord,
  getRestaurantOrdersByDayRecord,
  getRestaurantOrdersByModeRecord,
} from "./_internal/dashboard";
import {
  deleteRestaurantScheduleRecord,
  getRestaurantScheduleRecords,
  resubmitRestaurantRecord,
  saveRestaurantScheduleRecord,
  toggleRestaurantScheduleRecord,
  updateRestaurantProfileRecord,
  updateRestaurantServiceStateRecord,
} from "./_internal/profile";
import {
  openingHoursSchema,
  restaurantUpdateSchema,
  type OpeningHoursInput,
  type PartnerRestaurantDTO,
  type PublicRestaurantDTO,
  type RestaurantOrderContextDTO,
  type RestaurantUpdateInput,
} from "./contracts";
import {
  isRestaurantPubliclyVisible,
  setRestaurantOnlineState,
  setRestaurantOrderAcceptanceState,
} from "./model";
import { invalidateRestaurantCache } from "@/infrastructure/cache";
import type { DbExecutor, TransactionExecutor } from "@/infrastructure/db";
import { incrementRestaurantOrderCountRecord } from "./_internal/metrics";
import { getPartnerAccountByUserId } from "@/modules/partners/server";
import {
  getAdminRestaurantCountsRecord,
  getAdminRestaurantDetailRecord,
  listAdminRestaurantRecords,
  reactivateAdminRestaurantRecord,
  rejectAdminRestaurantRecord,
  suspendAdminRestaurantRecord,
  validateAdminRestaurantRecord,
} from "./_internal/admin";

export function getRestaurantAccessByPartnerAccountId(partnerAccountId: string) {
  return getRestaurantAccessRecordByPartnerAccountId(partnerAccountId);
}

function toPartnerRestaurantDTO(
  restaurant: NonNullable<
    Awaited<ReturnType<typeof getPartnerRestaurantRecord>>
  >,
): PartnerRestaurantDTO {
  return {
    id: restaurant.id,
    partnerAccountId: restaurant.partnerAccountId,
    nom: restaurant.nom,
    slug: restaurant.slug,
    description: restaurant.description,
    telephone: restaurant.telephone,
    email: restaurant.email,
    siteWeb: restaurant.siteWeb,
    adresse: restaurant.adresse,
    ville: restaurant.ville,
    pays: restaurant.pays,
    latitude: restaurant.latitude,
    longitude: restaurant.longitude,
    logoUrl: restaurant.logoUrl,
    banniereUrl: restaurant.banniereUrl,
    fraisLivraison: restaurant.fraisLivraison,
    commandeMinimum: restaurant.commandeMinimum,
    modesCommande: restaurant.modesCommande,
    cuisines: restaurant.cuisines ?? [],
    actif: restaurant.actif,
    enLigne: restaurant.enLigne,
    accepteCommandes: restaurant.accepteCommandes,
    tempsPreparationMoyen: restaurant.tempsPreparationMoyen ?? 20,
    facebook: restaurant.facebook,
    instagram: restaurant.instagram,
    whatsapp: restaurant.whatsapp,
    motifRejet: restaurant.motifRejet,
    suspendu: restaurant.suspendu,
    motifSuspension: restaurant.motifSuspension,
  };
}

function toPublicRestaurantDTO(
  restaurant: NonNullable<
    Awaited<ReturnType<typeof getPublicRestaurantRecordBySlug>>
  >,
): PublicRestaurantDTO {
  return {
    id: restaurant.id,
    slug: restaurant.slug,
    nom: restaurant.nom,
    description: restaurant.description,
    telephone: restaurant.telephone,
    email: restaurant.email,
    siteWeb: restaurant.siteWeb,
    adresse: restaurant.adresse,
    ville: restaurant.ville,
    pays: restaurant.pays,
    latitude: restaurant.latitude,
    longitude: restaurant.longitude,
    logoUrl: restaurant.logoUrl,
    banniereUrl: restaurant.banniereUrl,
    fraisLivraison: restaurant.fraisLivraison,
    commandeMinimum: restaurant.commandeMinimum,
    modesCommande: restaurant.modesCommande,
    cuisines: restaurant.cuisines ?? [],
    enLigne: restaurant.enLigne,
    accepteCommandes: restaurant.accepteCommandes,
    tempsPreparationMoyen: restaurant.tempsPreparationMoyen ?? 20,
    noteMoyenne: restaurant.noteMoyenne ?? 0,
    nombreAvis: restaurant.nombreAvis,
    facebook: restaurant.facebook,
    instagram: restaurant.instagram,
    whatsapp: restaurant.whatsapp,
  };
}

function toRestaurantOrderContextDTO(
  restaurant: NonNullable<
    Awaited<ReturnType<typeof getRestaurantOrderContextRecord>>
  >,
): RestaurantOrderContextDTO {
  const verification = restaurant.partnerAccount.identityVerification;
  return {
    id: restaurant.id,
    partnerAccountId: restaurant.partnerAccountId,
    notificationUserId: restaurant.partnerAccount.userId,
    actif: restaurant.actif,
    suspendu: restaurant.suspendu,
    enLigne: restaurant.enLigne,
    accepteCommandes: restaurant.accepteCommandes,
    modesCommande: restaurant.modesCommande,
    fraisLivraison: restaurant.fraisLivraison,
    commandeMinimum: restaurant.commandeMinimum,
    serviceMarketId: restaurant.serviceMarketId,
    serviceMarketVersionId: restaurant.serviceMarketVersionId,
    ownerIdentityStatus:
      verification?.status === "verified" && verification.verifiedAt
        ? "verified"
        : (verification?.status ?? "not_submitted"),
  };
}

export async function getRestaurantByPartnerAccountId(
  partnerAccountId: string,
) {
  const restaurant = await getPartnerRestaurantRecord(partnerAccountId);
  return restaurant ? toPartnerRestaurantDTO(restaurant) : null;
}

export async function getRestaurantByOwnerUserId(userId: string) {
  const account = await getPartnerAccountByUserId(userId);
  return account ? getRestaurantByPartnerAccountId(account.id) : null;
}

export async function getPublicRestaurantBySlug(slug: string) {
  const restaurant = await getPublicRestaurantRecordBySlug(slug);
  if (!restaurant) return null;
  const verification = restaurant.partnerAccount.identityVerification;
  if (
    !isRestaurantPubliclyVisible({
      ...restaurant,
      ownerIdentityStatus:
        verification?.status === "verified" && verification.verifiedAt
          ? "verified"
          : (verification?.status ?? "not_submitted"),
    })
  ) {
    return null;
  }
  return toPublicRestaurantDTO(restaurant);
}

export function listPublicRestaurantSitemapEntries() {
  return listPublicRestaurantSitemapRecords();
}

export function getRestaurantDashboardStats(restaurantId: string) {
  return getRestaurantDashboardStatsRecord(restaurantId);
}

export function getRestaurantOrdersByMode(restaurantId: string) {
  return getRestaurantOrdersByModeRecord(restaurantId);
}

export function getRestaurantOrdersByDay(restaurantId: string, days = 7) {
  return getRestaurantOrdersByDayRecord(restaurantId, days);
}

export async function updateRestaurantProfile(
  restaurantId: string,
  input: RestaurantUpdateInput,
  media?: {
    ownerUserId: string;
    logoAssetId?: string;
    bannerAssetId?: string;
  },
) {
  const updated = await updateRestaurantProfileRecord(
    restaurantId,
    restaurantUpdateSchema.parse(input),
    media,
  );
  await invalidateRestaurantCache(restaurantId);
  return updated;
}

export async function setRestaurantOnline(
  restaurantId: string,
  enLigne: boolean,
) {
  const restaurant = await getPartnerRestaurantRecordById(restaurantId);
  if (!restaurant) {
    throw new Error("Restaurant introuvable.");
  }
  const state = setRestaurantOnlineState(restaurant, enLigne);
  const updated = await updateRestaurantServiceStateRecord(restaurantId, state);
  await invalidateRestaurantCache(restaurantId);
  return updated;
}

export async function setRestaurantOrderAcceptance(
  restaurantId: string,
  accepteCommandes: boolean,
) {
  const restaurant = await getPartnerRestaurantRecordById(restaurantId);
  if (!restaurant) throw new Error("Restaurant introuvable.");
  const state = setRestaurantOrderAcceptanceState(
    restaurant,
    accepteCommandes,
  );
  const updated = await updateRestaurantServiceStateRecord(restaurantId, state);
  await invalidateRestaurantCache(restaurantId);
  return updated;
}

async function getPartnerRestaurantRecordById(restaurantId: string) {
  const candidate = await getRestaurantOrderContextRecord(restaurantId);
  return candidate;
}

export async function resubmitRestaurant(
  restaurantId: string,
  ownerUserId: string,
) {
  const restaurant = await resubmitRestaurantRecord(
    restaurantId,
    ownerUserId,
  );
  if (restaurant) {
    await invalidateRestaurantCache(restaurant.id, restaurant.slug);
  }
  return restaurant;
}

export async function getRestaurantSchedules(restaurantId: string) {
  const rows = await getRestaurantScheduleRecords(restaurantId);
  return rows.map((row) => ({
    id: row.id,
    restaurantId: row.restaurantId,
    nom: row.nom,
    heureOuverture: row.heureOuverture,
    heureFermeture: row.heureFermeture,
    joursActifs: row.joursActifs,
    actif: row.actif,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function saveRestaurantSchedule(
  restaurantId: string,
  input: OpeningHoursInput,
) {
  const row = await saveRestaurantScheduleRecord(
    restaurantId,
    openingHoursSchema.parse(input),
  );
  await invalidateRestaurantCache(restaurantId);
  return row
    ? {
        ...row,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }
    : null;
}

export async function toggleRestaurantSchedule(
  restaurantId: string,
  scheduleId: string,
  active: boolean,
) {
  const row = await toggleRestaurantScheduleRecord(
    restaurantId,
    scheduleId,
    active,
  );
  await invalidateRestaurantCache(restaurantId);
  return row;
}

export async function deleteRestaurantSchedule(
  restaurantId: string,
  scheduleId: string,
) {
  const rows = await deleteRestaurantScheduleRecord(
    restaurantId,
    scheduleId,
  );
  await invalidateRestaurantCache(restaurantId);
  return rows;
}

export function getRestaurantOrderCandidateBySlug(
  slug: string,
  options: { executor?: DbExecutor } = {},
) {
  return getRestaurantOrderCandidateRecordBySlug(slug, options.executor);
}

export async function getRestaurantOrderContext(
  restaurantId: string,
  options: { executor?: DbExecutor } = {},
) {
  const restaurant = await getRestaurantOrderContextRecord(
    restaurantId,
    options.executor,
  );
  return restaurant ? toRestaurantOrderContextDTO(restaurant) : null;
}

export function getRestaurantOrderDisplayIdentity(
  restaurantId: string,
  options: { executor?: DbExecutor } = {},
) {
  return getRestaurantOrderDisplayRecord(restaurantId, options.executor);
}

export function lockRestaurantForOrder(
  restaurantId: string,
  tx: TransactionExecutor,
) {
  return lockRestaurantOrderRecord(restaurantId, tx);
}

export function recordRestaurantOrderAccepted(
  restaurantId: string,
  tx: TransactionExecutor,
) {
  return incrementRestaurantOrderCountRecord(restaurantId, tx);
}

export async function getAdminRestaurantAccountSummary(
  partnerAccountId: string,
) {
  const restaurant = await getRestaurantAccessRecordByPartnerAccountId(
    partnerAccountId,
  );
  return restaurant
    ? {
        id: restaurant.id,
        name: restaurant.nom,
        active: restaurant.actif,
        suspended: restaurant.suspendu,
        rejectionReason: restaurant.motifRejet,
      }
    : null;
}

export async function listAdminRestaurants(input: AdminRestaurantListInput) {
  const result = await listAdminRestaurantRecords(
    adminRestaurantListSchema.parse(input),
  );
  return {
    ...result,
    items: result.items.map((restaurant) => ({
      ...restaurant,
      createdAt: restaurant.createdAt.toISOString(),
    })),
  };
}

export async function getAdminRestaurantCounts() {
  const counts = await getAdminRestaurantCountsRecord();
  return {
    enAttente: Number(counts?.enAttente ?? 0),
    actifs: Number(counts?.actifs ?? 0),
    suspendus: Number(counts?.suspendus ?? 0),
    rejetes: Number(counts?.rejetes ?? 0),
    total: Number(counts?.total ?? 0),
  };
}

export async function getAdminRestaurantDetail(restaurantId: string) {
  const row = await getAdminRestaurantDetailRecord(
    adminRestaurantIdSchema.parse(restaurantId),
  );
  return row
    ? {
        id: row.id,
        partnerAccountId: row.partnerAccountId,
        nom: row.nom,
        adresse: row.adresse,
        telephone: row.telephone,
        actif: row.actif,
        suspendu: row.suspendu,
        motifRejet: row.motifRejet,
        motifSuspension: row.motifSuspension,
        nombreCommandes: row.nombreCommandes,
        noteMoyenne: row.noteMoyenne,
        createdAt: row.createdAt.toISOString(),
        proprietaire: {
          nom: row.ownerName,
          email: row.ownerEmail,
          telephone: row.ownerPhone,
        },
      }
    : null;
}

export function validateAdminRestaurant(
  restaurantId: string,
  adminId: string,
) {
  return validateAdminRestaurantRecord(
    adminRestaurantIdSchema.parse(restaurantId),
    adminRestaurantIdSchema.parse(adminId),
  );
}

export function rejectAdminRestaurant(
  restaurantId: string,
  adminId: string,
  reason: string,
) {
  return rejectAdminRestaurantRecord(
    adminRestaurantIdSchema.parse(restaurantId),
    adminRestaurantIdSchema.parse(adminId),
    adminRestaurantTransitionReasonSchema.parse(reason),
  );
}

export function suspendAdminRestaurant(
  restaurantId: string,
  adminId: string,
  reason: string,
) {
  return suspendAdminRestaurantRecord(
    adminRestaurantIdSchema.parse(restaurantId),
    adminRestaurantIdSchema.parse(adminId),
    adminRestaurantTransitionReasonSchema.parse(reason),
  );
}

export function reactivateAdminRestaurant(
  restaurantId: string,
  adminId: string,
) {
  return reactivateAdminRestaurantRecord(
    adminRestaurantIdSchema.parse(restaurantId),
    adminRestaurantIdSchema.parse(adminId),
  );
}

export function createRestaurant(
  input: CreateRestaurantInput,
  menuPolicy: {
    initialCategoryNames: string[];
    dishLimit: number | null;
    planCode: string;
  },
) {
  return createRestaurantRecord(input, menuPolicy);
}

function throwResolutionError(
  result: Exclude<
    Awaited<ReturnType<typeof resolveServiceMarketAtPoint>>,
    { status: "resolved" }
  >,
): never {
  switch (result.status) {
    case "stale_location":
      throw new RestaurantMarketError(
        "CURRENT_LOCATION_STALE",
        "Votre position est trop ancienne. Actualisez-la pour continuer.",
      );
    case "imprecise_location":
      throw new RestaurantMarketError(
        "CURRENT_LOCATION_IMPRECISE",
        "Votre position n'est pas assez précise. Réessayez dans un endroit dégagé.",
      );
    case "ambiguous_market":
      throw new RestaurantMarketError(
        "SERVICE_MARKET_AMBIGUOUS",
        "Votre position correspond à plusieurs zones de service.",
      );
    case "unserved_area":
    case "invalid_coordinates":
      throw new RestaurantMarketError(
        "LOCATION_OUTSIDE_SERVICE_MARKET",
        "Aucun marché Restaurants n'est disponible à votre position.",
      );
  }
}

export async function getRestaurantDiscoveryEligibility(
  input: RestaurantSearchInput,
): Promise<RestaurantDiscoveryEligibilityDTO> {
  const parsed = restaurantSearchSchema.parse(input);
  const policyMode = env.RESTAURANT_GEO_POLICY_MODE;
  if (policyMode === "off") {
    const records = await searchVisibleRestaurantsLegacy(parsed);
    return {
      records,
      scope: "legacy",
      market: null,
      capability: null,
      policyMode,
    };
  }
  const resolution = await resolveServiceMarketAtPoint({
    ...parsed.currentLocation,
    context: "currentLocation",
    use: "discovery",
  });
  if (resolution.status !== "resolved") {
    if (policyMode === "shadow") {
      const records = await searchVisibleRestaurantsLegacy(parsed);
      return {
        records,
        scope: "legacy",
        market: null,
        capability: null,
        policyMode,
      };
    }
    throwResolutionError(resolution);
  }

  const capability = await getServiceMarketCapability(
    resolution.market.id,
    "restaurant",
  );
  const restaurantCapability = capability
    ? { activityType: "restaurant" as const, status: capability.status }
    : null;
  if (!capability || capability.status !== "active") {
    if (policyMode === "shadow") {
      const records = await searchVisibleRestaurantsLegacy(parsed);
      return {
        records,
        scope: "legacy",
        market: resolution.market,
        capability: restaurantCapability,
        policyMode,
      };
    }
    throw new RestaurantMarketError(
      "RESTAURANT_ACTIVITY_UNAVAILABLE",
      "Les restaurants ne sont pas disponibles dans cette zone actuellement.",
      { status: capability?.status ?? null },
    );
  }
  const records = await searchVisibleRestaurantsInMarket(
    resolution.market.id,
    parsed,
  );
  return {
    records,
    scope: `market:${resolution.market.id}`,
    market: resolution.market,
    capability: restaurantCapability,
    policyMode,
  };
}

export async function resolveRestaurantMarketAssignment(
  input: RestaurantLocationInput,
) {
  return prepareRestaurantMarketAssignment(restaurantLocationSchema.parse(input));
}

export async function changeRestaurantLocation(
  input: ChangeRestaurantLocationInput,
) {
  return changeRestaurantLocationInternal(
    changeRestaurantLocationSchema.parse(input),
  );
}
