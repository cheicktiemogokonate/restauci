// "use server";

// import { getRestaurateurSession } from "@/lib/auth/get-restaurateur-session";
// import { updateStatutCommande } from "@/lib/db/mutations";
// import { createLogger } from "@/lib/logger";
// import { revalidatePath } from "next/cache";
// import { z } from "zod";
// import { StatutCommande } from "@/types";

// const log = createLogger("actions-commandes");

// const statutsValides = [
//   "recue",
//   "en_preparation",
//   "prete",
//   "servie",
//   "annulee",
// ] as const;

// const changerStatutSchema = z.object({
//   commandeId: z.string().min(1),
//   statut: z.enum(statutsValides),
// });

// export async function changerStatutCommandeAction(
//   commandeId: string,
//   statut: StatutCommande,
// ) {
//   const { restaurant } = await getRestaurateurSession();

//   const parsed = changerStatutSchema.safeParse({ commandeId, statut });
//   if (!parsed.success) return { error: "Données invalides" };

//   try {
//     await updateStatutCommande(
//       parsed.data.commandeId,
//       restaurant.id,
//       parsed.data.statut,
//     );
//   } catch (error) {
//     log.error(
//       { error, commandeId, restaurantId: restaurant.id },
//       "[changerStatutCommande] error",
//     );
//     return { error: "Impossible de mettre à jour le statut" };
//   }

//   revalidatePath("/restaurateur/commandes");
//   revalidatePath(`/restaurateur/commandes/${commandeId}`);
//   return { success: true };
// }


// lib/actions/commandes.ts
"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { commandes, restaurants } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import type { Commande } from "@/types";

export async function updateCommandeStatus(
  commandeId: string,
  statut: Commande["statut"]
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("Non authentifié");

  const restaurant = await db.query.restaurants.findFirst({
    where: eq(restaurants.userId, currentUser.userId),
  });
  if (!restaurant) throw new Error("Restaurant introuvable");

  const result = await db
    .update(commandes)
    .set({ statut, updatedAt: new Date() })
    .where(
      and(eq(commandes.id, commandeId), eq(commandes.restaurantId, restaurant.id))
    )
    .returning({ id: commandes.id });

  if (result.length === 0) {
    throw new Error("Commande introuvable ou non autorisée");
  }
  revalidatePath("/restaurateur/commandes");
  revalidatePath(`/restaurateur/commandes/${commandeId}`);

}