"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { getCommandeById, getMyRestaurant } from "@/lib/db/queries";
import {
  cancelRestaurantDeliveryOrder,
  proposeDeliveryDriver,
} from "@/modules/deliveries/server";
import { updateStatutCommande } from "@/lib/db/mutations";
import type { StatutCommande } from "@/lib/db/types";

export async function updateCommandeStatus(
  commandeId: string,
  statut: StatutCommande,
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("Non authentifié");

  const restaurant = await getMyRestaurant(currentUser.userId);
  if (!restaurant) throw new Error("Restaurant introuvable");

  const existingCommande = await getCommandeById(commandeId, restaurant.id);
  if (!existingCommande) throw new Error("Commande introuvable");
  const commande =
    existingCommande.modeCommande === "livraison" && statut === "annulee"
      ? await cancelRestaurantDeliveryOrder(
          { userId: currentUser.userId, restaurantId: restaurant.id },
          commandeId,
        )
      : await updateStatutCommande(commandeId, restaurant.id, statut);
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

  const restaurant = await getMyRestaurant(currentUser.userId);
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
