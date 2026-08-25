import "server-only";

import type { DbExecutor } from "@/infrastructure/db";
import { createLogger } from "@/infrastructure/logger";
import { env } from "@/lib/env";
import {
  getServiceMarketCapability,
  resolveServiceMarketAtCoordinates,
  resolveServiceMarketAtPoint,
} from "@/modules/service-markets/server";
import type { LocationSample } from "@/modules/service-markets/model";
import {
  RESTAURANT_GEO_POLICY_VERSION,
  RestaurantOrderError,
} from "../model";

const log = createLogger("restaurant-order-geography");

export interface RestaurantOrderGeographyInput {
  modeCommande: "sur_place" | "livraison" | "emporter";
  currentLocation?: LocationSample;
  latitudeLivraison?: number;
  longitudeLivraison?: number;
}

export interface RestaurantGeographyState {
  serviceMarketId: string | null;
  serviceMarketVersionId: string | null;
}

export interface RestaurantOrderGeographySnapshot {
  serviceMarketId: string;
  serviceMarketVersionId: string;
  clientLocationCapturedAt: Date;
  clientLocationAccuracyM: number;
  geoPolicyVersion: typeof RESTAURANT_GEO_POLICY_VERSION;
}

function throwCurrentResolutionError(
  resolution: Exclude<
    Awaited<ReturnType<typeof resolveServiceMarketAtPoint>>,
    { status: "resolved" }
  >,
): never {
  if (resolution.status === "stale_location") {
    throw new RestaurantOrderError(
      "CURRENT_LOCATION_STALE",
      "Votre position est trop ancienne. Actualisez-la avant de commander.",
    );
  }
  if (resolution.status === "imprecise_location") {
    throw new RestaurantOrderError(
      "CURRENT_LOCATION_IMPRECISE",
      "Votre position n'est pas assez précise pour autoriser cette commande.",
    );
  }
  if (resolution.status === "ambiguous_market") {
    throw new RestaurantOrderError(
      "SERVICE_MARKET_AMBIGUOUS",
      "Votre position correspond à plusieurs zones de service.",
    );
  }
  throw new RestaurantOrderError(
    "LOCATION_OUTSIDE_SERVICE_MARKET",
    "Votre position se trouve en dehors des zones desservies.",
  );
}

async function enforceRestaurantOrderGeography(
  executor: Pick<DbExecutor, "execute">,
  restaurant: RestaurantGeographyState,
  input: RestaurantOrderGeographyInput,
): Promise<RestaurantOrderGeographySnapshot> {
  if (!input.currentLocation) {
    throw new RestaurantOrderError(
      "CURRENT_LOCATION_REQUIRED",
      "Votre position actuelle est nécessaire pour commander.",
    );
  }
  if (!restaurant.serviceMarketId || !restaurant.serviceMarketVersionId) {
    throw new RestaurantOrderError(
      "RESTAURANT_OUTSIDE_SERVICE_MARKET",
      "Ce restaurant n'est pas encore rattaché à une zone de service.",
    );
  }

  const currentResolution = await resolveServiceMarketAtPoint(
    {
      ...input.currentLocation,
      context: "currentLocation",
      use: "checkout",
    },
    { executor },
  );
  if (currentResolution.status !== "resolved") {
    throwCurrentResolutionError(currentResolution);
  }
  const capability = await getServiceMarketCapability(
    currentResolution.market.id,
    "restaurant",
    executor,
  );
  if (capability?.status !== "active") {
    throw new RestaurantOrderError(
      "RESTAURANT_ACTIVITY_UNAVAILABLE",
      "Les commandes Restaurants sont indisponibles dans cette zone.",
    );
  }
  if (currentResolution.market.id !== restaurant.serviceMarketId) {
    throw new RestaurantOrderError(
      "SERVICE_MARKET_MISMATCH",
      "Vous ne pouvez pas commander dans un restaurant situé dans une autre zone.",
    );
  }

  if (input.modeCommande === "livraison") {
    if (
      input.latitudeLivraison === undefined ||
      input.longitudeLivraison === undefined
    ) {
      throw new RestaurantOrderError(
        "DELIVERY_LOCATION_REQUIRED",
        "Les coordonnées de l'adresse de livraison sont obligatoires.",
      );
    }
    const deliveryResolution = await resolveServiceMarketAtCoordinates(
      {
        lat: input.latitudeLivraison,
        lng: input.longitudeLivraison,
      },
      executor,
    );
    if (deliveryResolution.status === "ambiguous_market") {
      throw new RestaurantOrderError(
        "SERVICE_MARKET_AMBIGUOUS",
        "L'adresse de livraison correspond à plusieurs zones.",
      );
    }
    if (deliveryResolution.status !== "resolved") {
      throw new RestaurantOrderError(
        "LOCATION_OUTSIDE_SERVICE_MARKET",
        "L'adresse de livraison se trouve en dehors des zones desservies.",
      );
    }
    if (deliveryResolution.market.id !== restaurant.serviceMarketId) {
      throw new RestaurantOrderError(
        "SERVICE_MARKET_MISMATCH",
        "L'adresse de livraison et le restaurant doivent se trouver dans la même zone.",
      );
    }
  }

  return {
    serviceMarketId: currentResolution.market.id,
    serviceMarketVersionId: currentResolution.market.versionId,
    clientLocationCapturedAt: new Date(input.currentLocation.capturedAt),
    clientLocationAccuracyM: input.currentLocation.accuracyMeters,
    geoPolicyVersion: RESTAURANT_GEO_POLICY_VERSION,
  };
}

export async function validateRestaurantOrderGeography(
  executor: Pick<DbExecutor, "execute">,
  restaurant: RestaurantGeographyState,
  input: RestaurantOrderGeographyInput,
): Promise<RestaurantOrderGeographySnapshot | null> {
  if (env.RESTAURANT_GEO_POLICY_MODE === "off") return null;
  try {
    const snapshot = await enforceRestaurantOrderGeography(
      executor,
      restaurant,
      input,
    );
    log.info(
      {
        outcome: "accepted",
        serviceMarketId: snapshot.serviceMarketId,
        serviceMarketVersionId: snapshot.serviceMarketVersionId,
        modeCommande: input.modeCommande,
      },
      "Validation géographique de commande terminée",
    );
    return snapshot;
  } catch (error) {
    log.warn(
      {
        outcome: "rejected",
        code:
          error instanceof RestaurantOrderError ? error.code : "UNKNOWN_ERROR",
        restaurantServiceMarketId: restaurant.serviceMarketId,
        modeCommande: input.modeCommande,
        policyMode: env.RESTAURANT_GEO_POLICY_MODE,
      },
      "Validation géographique de commande refusée",
    );
    if (env.RESTAURANT_GEO_POLICY_MODE === "shadow") return null;
    throw error;
  }
}
