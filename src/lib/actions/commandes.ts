"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { getMyRestaurant } from "@/lib/db/queries";
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

  await updateStatutCommande(commandeId, restaurant.id, statut);

  revalidatePath("/restaurateur/commandes");
  revalidatePath(`/restaurateur/commandes/${commandeId}`);
}
