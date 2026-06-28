"use server";

import { getRestaurateurSession } from "@/lib/auth/get-restaurateur-session";
import { updateStatutCommande } from "@/lib/db/mutations";
import { createLogger } from "@/lib/logger";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const log = createLogger("actions-commandes");

const statutsValides = [
  "en_preparation",
  "prete",
  "servie",
  "annulee",
] as const;

const changerStatutSchema = z.object({
  commandeId: z.string().min(1),
  statut: z.enum(statutsValides),
});

export async function changerStatutCommandeAction(
  commandeId: string,
  statut: (typeof statutsValides)[number],
) {
  const { restaurant } = await getRestaurateurSession();

  const parsed = changerStatutSchema.safeParse({ commandeId, statut });
  if (!parsed.success) return { error: "Données invalides" };

  try {
    await updateStatutCommande(
      parsed.data.commandeId,
      restaurant.id,
      parsed.data.statut,
    );
  } catch (error) {
    log.error(
      { error, commandeId, restaurantId: restaurant.id },
      "[changerStatutCommande] error",
    );
    return { error: "Impossible de mettre à jour le statut" };
  }

  revalidatePath("/restaurateur/commandes");
  revalidatePath(`/restaurateur/commandes/${commandeId}`);
  return { success: true };
}
