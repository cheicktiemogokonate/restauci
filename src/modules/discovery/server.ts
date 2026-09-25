import "server-only";

import {
  rankDiscoveryPage,
  type DiscoveryActivityType,
  type DiscoveryPlanBenefits,
} from "./model";
import { SUBSCRIPTION_PLAN_CODES } from "@/modules/subscriptions/model";
import { getPublishedSubscriptionCatalogue } from "@/modules/subscriptions/server";
import {
  etablissementSearchSchema,
  moodSearchSchema,
  type EtablissementItemDTO,
  type EtablissementSearchInput,
  type EtablissementSearchResultDTO,
  type MoodSearchInput,
} from "./contracts";
import {
  restaurantSearchSchema,
  type RestaurantSearchInput,
  type RestaurantSearchResultDTO,
  type RestaurantSearchItemDTO,
} from "@/modules/restaurants/contracts";
import { getRestaurantDiscoveryEligibility } from "@/modules/restaurants/server";
import {
  publicResidenceSearchSchema,
  type PublicResidenceSearchInput,
  type PublicResidenceSearchResultDTO,
  type ResidenceGeoItemDTO,
  type ResidenceGeoDiscoveryEligibleRecord,
} from "@/modules/residences/contracts";
import {
  getResidenceDiscoveryEligibility,
  getResidenceGeoDiscoveryEligibility,
} from "@/modules/residences/server";
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
    parsed.query ?? "",
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

function toRestaurantEtablissementItem(
  item: RestaurantSearchItemDTO,
): EtablissementItemDTO {
  return {
    id: item.id,
    type: "restaurant",
    nom: item.nom,
    slug: item.slug,
    description: item.description,
    adresse: item.adresse,
    ville: item.ville,
    latitude: item.latitude,
    longitude: item.longitude,
    distanceKm: item.distanceKm,
    imageUrl: item.logoUrl ?? item.banniereUrl,
    banniereUrl: item.banniereUrl,
    noteMoyenne: item.noteMoyenne,
    nombreAvis: item.nombreAvis,
    enLigne: item.enLigne,
    prixAffiche:
      item.commandeMinimum > 0
        ? `Min. ${item.commandeMinimum.toLocaleString("fr-FR")} FCFA`
        : null,
    prixFcfa: item.commandeMinimum,
    tags: item.cuisines ?? [],
    placement: item.placement,
    partnerBadgeEnabled: item.partnerBadgeEnabled,
    discoveryToken: item.discoveryToken,
  };
}

function toResidenceEtablissementItem(
  item: ResidenceGeoItemDTO,
  placement: "promoted" | "organic",
  partnerBadgeEnabled: boolean,
  discoveryToken: string,
): EtablissementItemDTO {
  const firstPhoto = item.photos[0]?.url ?? null;
  return {
    id: item.id,
    type: "residence",
    nom: item.title,
    slug: item.slug,
    description: item.description,
    adresse: item.address,
    ville: item.city,
    latitude: item.latitude,
    longitude: item.longitude,
    distanceKm: item.distanceKm,
    imageUrl: firstPhoto,
    banniereUrl: item.photos[1]?.url ?? firstPhoto,
    noteMoyenne: null,
    nombreAvis: 0,
    enLigne: true,
    prixAffiche: `${item.pricePerNightFcfa.toLocaleString("fr-FR")} FCFA / nuit`,
    prixFcfa: item.pricePerNightFcfa,
    tags: [`${item.maxGuests} pers. max`, item.city],
    placement,
    partnerBadgeEnabled,
    discoveryToken,
  };
}

async function rankAndAttributeGeoResidences(
  records: ResidenceGeoDiscoveryEligibleRecord[],
  contextKey: string,
  page: number,
  limit: number,
): Promise<{ items: EtablissementItemDTO[]; total: number }> {
  if (records.length === 0) {
    return { items: [], total: 0 };
  }
  const configuration = await getDiscoveryRankingConfiguration("residence");
  const ranking = rankDiscoveryPage({
    candidates: records.map((record) => record.candidate),
    ...configuration,
    context: {
      contextKey,
      page,
      pageSize: limit,
      at: new Date(),
    },
  });
  const recordsMap = new Map(records.map((record) => [record.item.id, record]));
  const tokens = await issueDiscoveryAttributions(
    ranking.items.map((ranked) => {
      const record = recordsMap.get(ranked.resourceId);
      if (!record) {
        throw new Error(`Résidence introuvable : ${ranked.resourceId}`);
      }
      return {
        ...ranked,
        contextKey,
        destinationPath: `/residences/${record.item.slug}`,
      };
    }),
  );
  const items: EtablissementItemDTO[] = ranking.items.map((ranked) => {
    const record = recordsMap.get(ranked.resourceId)!;
    return toResidenceEtablissementItem(
      record.item,
      ranked.placement,
      configuration.benefitsByPlan[ranked.planCode].partnerBadgeEnabled,
      tokens.get(ranked.resourceId) ?? "",
    );
  });
  return { items, total: ranking.total };
}

export async function searchEtablissements(
  input: EtablissementSearchInput,
): Promise<EtablissementSearchResultDTO> {
  const parsed = etablissementSearchSchema.parse(input);
  const { currentLocation, type, page, limit, radiusKm, search } = parsed;

  const shouldSearchRestaurants = type === "tous" || type === "restaurant";
  const shouldSearchResidences = type === "tous" || type === "residence";

  const fetchRestaurants = async (): Promise<EtablissementItemDTO[]> => {
    if (!shouldSearchRestaurants) return [];
    try {
      const res = await searchRestaurantsInCurrentMarket({
        currentLocation,
        query: search,
        legacyRadiusKm: radiusKm,
        page: 1,
        limit: Math.max(limit * page, 50),
      });
      return res.items.map(toRestaurantEtablissementItem);
    } catch {
      return [];
    }
  };

  const fetchResidences = async (): Promise<EtablissementItemDTO[]> => {
    if (!shouldSearchResidences) return [];
    try {
      const eligibleResidences = await getResidenceGeoDiscoveryEligibility({
        currentLocation,
        query: search,
        radiusKm,
        limit: Math.max(limit * page, 50),
      });
      const contextKey = [
        "etablissements",
        "carte",
        "residence",
        currentLocation.lat.toFixed(4),
        currentLocation.lng.toFixed(4),
        search ?? "",
      ].join(":");
      const res = await rankAndAttributeGeoResidences(
        eligibleResidences,
        contextKey,
        1,
        Math.max(limit * page, 50),
      );
      return res.items;
    } catch {
      return [];
    }
  };

  const [restaurants, residences] = await Promise.all([
    fetchRestaurants(),
    fetchResidences(),
  ]);

  const allItems = [...restaurants, ...residences].sort((a, b) => {
    if (a.placement === "promoted" && b.placement !== "promoted") return -1;
    if (a.placement !== "promoted" && b.placement === "promoted") return 1;
    return a.distanceKm - b.distanceKm || a.nom.localeCompare(b.nom);
  });

  const total = allItems.length;
  const offset = (page - 1) * limit;
  const paginatedItems = allItems.slice(offset, offset + limit);

  return {
    items: paginatedItems,
    total,
    page,
    limit,
  };
}

export async function searchMoodDiscovery(
  input: MoodSearchInput,
): Promise<EtablissementSearchResultDTO> {
  const parsed = moodSearchSchema.parse(input);
  const { currentLocation, query, mood, type, page, limit, radiusKm } = parsed;

  const shouldSearchRestaurants = type === "tous" || type === "restaurant";
  const shouldSearchResidences = type === "tous" || type === "residence";

  const fetchRestaurants = async (): Promise<EtablissementItemDTO[]> => {
    if (!shouldSearchRestaurants) return [];
    try {
      const res = await searchRestaurantsInCurrentMarket({
        currentLocation,
        query,
        mood,
        legacyRadiusKm: radiusKm,
        page: 1,
        limit: Math.max(limit * page, 50),
      });
      return res.items.map(toRestaurantEtablissementItem);
    } catch {
      return [];
    }
  };

  const fetchResidences = async (): Promise<EtablissementItemDTO[]> => {
    if (!shouldSearchResidences) return [];
    try {
      const eligibleResidences = await getResidenceGeoDiscoveryEligibility({
        currentLocation,
        query,
        mood,
        radiusKm,
        limit: Math.max(limit * page, 50),
      });
      const contextKey = [
        "mood",
        mood ?? "any",
        query ?? "none",
        currentLocation.lat.toFixed(4),
        currentLocation.lng.toFixed(4),
      ].join(":");
      const res = await rankAndAttributeGeoResidences(
        eligibleResidences,
        contextKey,
        1,
        Math.max(limit * page, 50),
      );
      return res.items;
    } catch {
      return [];
    }
  };

  const [restaurants, residences] = await Promise.all([
    fetchRestaurants(),
    fetchResidences(),
  ]);

  const allItems = [...restaurants, ...residences].sort((a, b) => {
    if (a.placement === "promoted" && b.placement !== "promoted") return -1;
    if (a.placement !== "promoted" && b.placement === "promoted") return 1;
    return a.distanceKm - b.distanceKm || a.nom.localeCompare(b.nom);
  });

  const total = allItems.length;
  const offset = (page - 1) * limit;
  const paginatedItems = allItems.slice(offset, offset + limit);

  return {
    items: paginatedItems,
    total,
    page,
    limit,
  };
}
