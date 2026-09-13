import "server-only";

import { eq } from "drizzle-orm";
import { transactionalDb } from "@/infrastructure/db";
import { restaurants } from "@/infrastructure/db/schema";
import { invalidateRestaurantCache } from "@/infrastructure/cache";
import {
  getServiceMarketCapability,
  resolveServiceMarketAtCoordinates,
} from "@/modules/service-markets/server";
import type { ChangeRestaurantLocationInput } from "../contracts";
import { RestaurantMarketError } from "../model";

export async function changeRestaurantLocationInternal(
  input: ChangeRestaurantLocationInput,
) {
  const result = await transactionalDb.transaction(async (tx) => {
    const current = await tx.query.restaurants.findFirst({
      where: eq(restaurants.id, input.restaurantId),
      columns: { id: true, slug: true, serviceMarketId: true },
    });
    if (!current) throw new Error("Restaurant introuvable.");

    const resolution = await resolveServiceMarketAtCoordinates(
      { lat: input.latitude, lng: input.longitude },
      tx,
    );
    if (resolution.status === "ambiguous_market") {
      throw new RestaurantMarketError(
        "SERVICE_MARKET_AMBIGUOUS",
        "Cette adresse appartient à plusieurs zones de service.",
      );
    }
    if (resolution.status !== "resolved") {
      throw new RestaurantMarketError(
        "LOCATION_OUTSIDE_SERVICE_MARKET",
        "Cette adresse se trouve en dehors des zones actuellement desservies.",
      );
    }
    const capability = await getServiceMarketCapability(
      resolution.market.id,
      "restaurant",
      tx,
    );
    if (
      !capability ||
      (capability.status !== "active" && capability.status !== "prelaunch")
    ) {
      throw new RestaurantMarketError(
        "RESTAURANT_ACTIVITY_UNAVAILABLE",
        "L'activité Restaurants n'est pas ouverte dans cette zone.",
      );
    }

    const marketChanged = current.serviceMarketId !== resolution.market.id;
    const [updated] = await tx
      .update(restaurants)
      .set({
        adresse: input.adresse,
        pays: input.pays ?? "Côte d'Ivoire",
        ville: resolution.market.name,
        latitude: input.latitude,
        longitude: input.longitude,
        serviceMarketId: resolution.market.id,
        serviceMarketVersionId: resolution.market.versionId,
        geoAssignmentStatus: "assigned",
        geoAssignedAt: new Date(),
        ...(marketChanged
          ? {
              actif: false,
              valideParUserId: null,
              valideAt: null,
            }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(restaurants.id, current.id))
      .returning();
    if (!updated) throw new Error("Mise à jour de l'adresse impossible.");
    return { updated, marketChanged, previousMarketId: current.serviceMarketId };
  });

  await invalidateRestaurantCache(result.updated.id, result.updated.slug);
  return result;
}
