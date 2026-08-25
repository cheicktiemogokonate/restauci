import "server-only";

import {
  getServiceMarketCapability,
  resolveServiceMarketAtCoordinates,
} from "@/modules/service-markets/server";
import type { GeoAssignmentStatus } from "@/modules/service-markets/model";
import type { RestaurantLocationInput } from "../contracts";
import { RestaurantMarketError } from "../model";

export interface RestaurantMarketAssignment {
  serviceMarketId: string;
  serviceMarketVersionId: string;
  geoAssignmentStatus: Extract<GeoAssignmentStatus, "assigned">;
  geoAssignedAt: Date;
  capabilityStatus: "active" | "prelaunch";
}

export async function prepareRestaurantMarketAssignment(
  input: RestaurantLocationInput,
): Promise<RestaurantMarketAssignment> {
  const resolution = await resolveServiceMarketAtCoordinates({
    lat: input.latitude,
    lng: input.longitude,
  });
  if (resolution.status === "unserved_area") {
    throw new RestaurantMarketError(
      "LOCATION_OUTSIDE_SERVICE_MARKET",
      "Cette adresse se trouve en dehors des zones actuellement desservies.",
    );
  }
  if (resolution.status === "ambiguous_market") {
    throw new RestaurantMarketError(
      "SERVICE_MARKET_AMBIGUOUS",
      "Cette adresse appartient à plusieurs zones. Une vérification administrative est nécessaire.",
    );
  }
  if (resolution.status !== "resolved") {
    throw new RestaurantMarketError(
      "LOCATION_OUTSIDE_SERVICE_MARKET",
      "Les coordonnées du restaurant sont invalides.",
    );
  }
  const capability = await getServiceMarketCapability(
    resolution.market.id,
    "restaurant",
  );
  if (
    !capability ||
    (capability.status !== "active" && capability.status !== "prelaunch")
  ) {
    throw new RestaurantMarketError(
      "RESTAURANT_ACTIVITY_UNAVAILABLE",
      "L'activité Restaurants n'est pas ouverte dans cette zone actuellement.",
      { marketCode: resolution.market.code, status: capability?.status ?? null },
    );
  }
  return {
    serviceMarketId: resolution.market.id,
    serviceMarketVersionId: resolution.market.versionId,
    geoAssignmentStatus: "assigned",
    geoAssignedAt: new Date(),
    capabilityStatus: capability.status,
  };
}
