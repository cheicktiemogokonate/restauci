import "server-only";

import {
  getServiceMarketCapability,
  resolveServiceMarketAtPoint,
} from "@/modules/service-markets/server";
import {
  restaurantLocationSchema,
  restaurantSearchSchema,
  changeRestaurantLocationSchema,
  type ChangeRestaurantLocationInput,
  type RestaurantLocationInput,
  type RestaurantSearchInput,
  type RestaurantSearchResultDTO,
} from "./contracts";
import { env } from "@/lib/env";
import { RestaurantMarketError } from "./model";
import { prepareRestaurantMarketAssignment } from "./_internal/location";
import { changeRestaurantLocationInternal } from "./_internal/change-location";
import {
  searchVisibleRestaurantsInMarket,
  searchVisibleRestaurantsLegacy,
  type RestaurantDiscoveryRecord,
} from "./_internal/search";
import {
  getDiscoveryRankingConfiguration,
  issueDiscoveryAttributions,
} from "@/modules/discovery/server";
import { rankDiscoveryPage } from "@/modules/discovery/ranking";

async function rankRestaurantRecords(
  records: RestaurantDiscoveryRecord[],
  input: RestaurantSearchInput,
  scope: string,
  configuration: Awaited<ReturnType<typeof getDiscoveryRankingConfiguration>>,
) {
  const contextKey = [
    "restaurant",
    scope,
    input.currentLocation.lat.toFixed(4),
    input.currentLocation.lng.toFixed(4),
    input.search ?? "",
    input.cuisine ?? "",
    input.modeCommande ?? "",
  ].join(":");
  const ranking = rankDiscoveryPage({
    candidates: records.map((record) => record.candidate),
    ...configuration,
    context: {
      contextKey,
      page: input.page,
      pageSize: input.limit,
      at: new Date(),
    },
  });
  const recordById = new Map(records.map((record) => [record.item.id, record]));
  const tokens = await issueDiscoveryAttributions(
    ranking.items.map((ranked) => {
      const record = recordById.get(ranked.resourceId);
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
    total: ranking.total,
    items: ranking.items.map((ranked) => {
      const record = recordById.get(ranked.resourceId);
      if (!record) throw new Error(`Restaurant classé introuvable : ${ranked.resourceId}`);
      return {
        ...record.item,
        placement: ranked.placement,
        partnerBadgeEnabled:
          configuration.benefitsByPlan[ranked.planCode].partnerBadgeEnabled,
        discoveryToken: tokens.get(ranked.resourceId) ?? "",
      };
    }),
  };
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

export async function searchRestaurantsInCurrentMarket(
  input: RestaurantSearchInput,
): Promise<RestaurantSearchResultDTO> {
  const parsed = restaurantSearchSchema.parse(input);
  const policyMode = env.RESTAURANT_GEO_POLICY_MODE;
  if (policyMode === "off") {
    const [records, configuration] = await Promise.all([
      searchVisibleRestaurantsLegacy(parsed),
      getDiscoveryRankingConfiguration("restaurant"),
    ]);
    const legacy = await rankRestaurantRecords(records, parsed, "legacy", configuration);
    return {
      ...legacy,
      page: parsed.page,
      limit: parsed.limit,
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
      const [records, configuration] = await Promise.all([
        searchVisibleRestaurantsLegacy(parsed),
        getDiscoveryRankingConfiguration("restaurant"),
      ]);
      const legacy = await rankRestaurantRecords(records, parsed, "legacy", configuration);
      return {
        ...legacy,
        page: parsed.page,
        limit: parsed.limit,
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
      const [records, configuration] = await Promise.all([
        searchVisibleRestaurantsLegacy(parsed),
        getDiscoveryRankingConfiguration("restaurant"),
      ]);
      const legacy = await rankRestaurantRecords(records, parsed, "legacy", configuration);
      return {
        ...legacy,
        page: parsed.page,
        limit: parsed.limit,
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
  const [records, configuration] = await Promise.all([
    searchVisibleRestaurantsInMarket(resolution.market.id, parsed),
    getDiscoveryRankingConfiguration("restaurant"),
  ]);
  const result = await rankRestaurantRecords(
    records,
    parsed,
    `market:${resolution.market.id}`,
    configuration,
  );
  return {
    ...result,
    page: parsed.page,
    limit: parsed.limit,
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
