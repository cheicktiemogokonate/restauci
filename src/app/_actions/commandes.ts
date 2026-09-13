"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/modules/auth/server";
import { getRestaurantByOwnerUserId } from "@/modules/restaurants/server";
import {
  cancelRestaurantDeliveryOrder,
  proposeDeliveryDriver,
} from "@/modules/deliveries/server";
import {
  getRestaurantOrder,
  transitionRestaurantOrder,
} from "@/modules/orders/server";
import type { RestaurantOrderStatus } from "@/modules/orders/model";

export async function updateCommandeStatus(
  commandeId: string,
  statut: RestaurantOrderStatus,
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("Non authentifié");

  const restaurant = await getRestaurantByOwnerUserId(currentUser.userId);
  if (!restaurant) throw new Error("Restaurant introuvable");

  const existingCommande = await getRestaurantOrder(commandeId, restaurant.id);
  if (!existingCommande) throw new Error("Commande introuvable");
  const commande =
    existingCommande.modeCommande === "livraison" && statut === "annulee"
      ? await cancelRestaurantDeliveryOrder(
          { userId: currentUser.userId, restaurantId: restaurant.id },
          commandeId,
        )
      : await transitionRestaurantOrder(
          {
            type: "restaurant",
            id: currentUser.userId,
            restaurantId: restaurant.id,
          },
          { orderId: commandeId, targetStatus: statut },
        );
  if (!commande) {
    throw new Error("La commande a déjà été mise à jour. Actualisez la page avant de réessayer.");
  }

  revalidatePath("/restaurateur/commandes");
  revalidatePath(`/restaurateur/commandes/${commandeId}`);
}

export async function assignCommandeDriver(
  commandeId: string,
  livreurId: string,
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("Non authentifié");

  const restaurant = await getRestaurantByOwnerUserId(currentUser.userId);
  if (!restaurant) throw new Error("Restaurant introuvable");

  await proposeDeliveryDriver(
    { userId: currentUser.userId, restaurantId: restaurant.id },
    { orderId: commandeId, driverId: livreurId },
  );

  revalidatePath("/restaurateur/commandes");
  revalidatePath(`/restaurateur/commandes/${commandeId}`);
}

export async function updateDeliveryStatus(
  _commandeId: string,
  _statut: "en_route" | "livree",
) {
  void _commandeId;
  void _statut;
  throw new Error(
    "Le départ et la remise sont réservés au compte du livreur.",
  );
}
