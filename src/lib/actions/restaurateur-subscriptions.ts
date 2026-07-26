"use server";

import { db } from "@/lib/db";
import { 
  subscriptionRequests, 
  subscriptionPlans
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getRestaurateurSession } from "@/lib/auth/get-restaurateur-session";
import { revalidatePath } from "next/cache";

export async function createSubscriptionRequestAction(planCode: string) {
  const { restaurant } = await getRestaurateurSession();

  return db.transaction(async (tx) => {
    // 1. Vérifier si le restaurant est actif
    if (!restaurant.actif || restaurant.suspendu) {
      throw new Error("Votre restaurant est inactif ou suspendu");
    }

    // 2. Vérifier s'il y a déjà une demande en attente
    const pending = await tx.query.subscriptionRequests.findFirst({
      where: and(
        eq(subscriptionRequests.restaurantId, restaurant.id),
        eq(subscriptionRequests.statut, "en_attente")
      )
    });

    if (pending) {
      throw new Error("Vous avez déjà une demande en cours de traitement");
    }

    // 3. Récupérer le plan
    const plan = await tx.query.subscriptionPlans.findFirst({
      where: eq(subscriptionPlans.code, planCode as any)
    });

    if (!plan || !plan.actif) {
      throw new Error("Offre non disponible");
    }

    // 4. Créer la demande
    await tx.insert(subscriptionRequests).values({
      restaurantId: restaurant.id,
      planCode: plan.code,
      prixFigeFcfa: plan.prixAnnuelFcfa,
      statut: "en_attente",
    });

    revalidatePath("/restaurateur/facturation");
    
    return { success: true };
  });
}
