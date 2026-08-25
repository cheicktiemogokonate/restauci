import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/infrastructure/db";
import { restaurants } from "@/lib/db/schema";
import {
  createRestaurantOrder as createRestaurantOrderLegacy,
  type CreateRestaurantOrderResult,
} from "@/lib/orders/restaurant-order";
import { isRestaurantOrderable } from "@/modules/restaurants/model";
import {
  prevalidateRestaurantOrderSchema,
  type PrevalidateRestaurantOrderInput,
} from "./contracts";
import { RestaurantOrderError } from "./model";
import { validateRestaurantOrderGeography } from "./_internal/geography";

export { RestaurantOrderError } from "./model";
export type { CreateRestaurantOrderResult } from "@/lib/orders/restaurant-order";

export async function createRestaurantOrder(
  input: Parameters<typeof createRestaurantOrderLegacy>[0],
): Promise<CreateRestaurantOrderResult> {
  return createRestaurantOrderLegacy(input);
}

export async function prevalidateRestaurantOrder(
  input: PrevalidateRestaurantOrderInput,
) {
  const parsed = prevalidateRestaurantOrderSchema.parse(input);
  const restaurant = await db.query.restaurants.findFirst({
    where: eq(restaurants.slug, parsed.restaurantSlug),
    columns: {
      id: true,
      actif: true,
      suspendu: true,
      enLigne: true,
      accepteCommandes: true,
      modesCommande: true,
      serviceMarketId: true,
      serviceMarketVersionId: true,
    },
  });
  if (!restaurant) {
    throw new RestaurantOrderError(
      "RESTAURANT_NOT_FOUND",
      "Restaurant introuvable.",
    );
  }
  if (!isRestaurantOrderable(restaurant)) {
    throw new RestaurantOrderError(
      "RESTAURANT_NOT_ORDERABLE",
      "Ce restaurant n'accepte pas de commandes actuellement.",
    );
  }
  if (!restaurant.modesCommande.includes(parsed.modeCommande)) {
    throw new RestaurantOrderError(
      "ORDER_MODE_NOT_SUPPORTED",
      "Ce mode de commande n'est pas proposé par le restaurant.",
    );
  }
  const geography = await validateRestaurantOrderGeography(db, restaurant, parsed);
  return { valid: true as const, geography };
}
