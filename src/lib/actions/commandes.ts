"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getMyRestaurant } from "@/lib/db/queries";
import { assignerLivreur, updateStatutCommande } from "@/lib/db/mutations";
import { pushSseEvent } from "@/lib/realtime/sse-push";
import type { StatutCommande } from "@/lib/db/types";
import { and, eq, sql } from "drizzle-orm";
import { commandes, livraisons, livreurs } from "@/lib/db/schema";
import { calculerCommissionCommande } from "@/lib/db/mutations-admin";

export async function updateCommandeStatus(
  commandeId: string,
  statut: StatutCommande,
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("Non authentifié");

  const restaurant = await getMyRestaurant(currentUser.userId);
  if (!restaurant) throw new Error("Restaurant introuvable");

  const commande = await updateStatutCommande(commandeId, restaurant.id, statut);
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

  const [commande, livreur] = await Promise.all([
    db.query.commandes.findFirst({
      where: (commandes, { and, eq }) =>
        and(
          eq(commandes.id, commandeId),
          eq(commandes.restaurantId, restaurant.id),
        ),
    }),
    db.query.livreurs.findFirst({
      where: (livreurs, { and, eq }) =>
        and(
          eq(livreurs.id, livreurId),
          eq(livreurs.restaurantId, restaurant.id),
          eq(livreurs.actif, true),
        ),
    }),
  ]);

  if (!commande || commande.modeCommande !== "livraison") {
    throw new Error("Cette commande ne peut pas être assignée à un livreur.");
  }
  if (!livreur) throw new Error("Livreur introuvable ou indisponible.");
  if (
    !commande.adresseLivraison ||
    commande.latitudeLivraison === null ||
    commande.longitudeLivraison === null
  ) {
    throw new Error("L'adresse et les coordonnées de livraison sont requises.");
  }

  await assignerLivreur({
    commandeId,
    livreurId,
    adresse: commande.adresseLivraison,
    latitude: commande.latitudeLivraison,
    longitude: commande.longitudeLivraison,
    distanceKm: commande.distanceKm,
  });

  after(async () => {
    await pushSseEvent(restaurant.id, "livreur_assigne", {
      commandeId,
      livreurId,
    });
  });

  revalidatePath("/restaurateur/commandes");
  revalidatePath(`/restaurateur/commandes/${commandeId}`);
}

export async function updateDeliveryStatus(
  commandeId: string,
  statut: "en_route" | "livree",
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("Non authentifié");
  const restaurant = await getMyRestaurant(currentUser.userId);
  if (!restaurant) throw new Error("Restaurant introuvable");

  const now = new Date();
  const result = await db.transaction(async (tx) => {
    const livraison = await tx.query.livraisons.findFirst({
      where: (row, { eq }) => eq(row.commandeId, commandeId),
      with: { commande: true },
    });
    if (
      !livraison ||
      livraison.commande.restaurantId !== restaurant.id ||
      livraison.commande.modeCommande !== "livraison"
    ) {
      throw new Error("Livraison introuvable.");
    }
    if (livraison.commande.statut !== "prete") {
      throw new Error("La commande doit être prête avant le départ du livreur.");
    }

    const expectedStatus = statut === "en_route" ? "assignee" : "en_route";
    const [updatedDelivery] = await tx
      .update(livraisons)
      .set({
        statut,
        ...(statut === "en_route"
          ? { heureDepart: now }
          : { heureLivree: now }),
        updatedAt: now,
      })
      .where(
        and(
          eq(livraisons.id, livraison.id),
          eq(livraisons.statut, expectedStatus),
        ),
      )
      .returning();
    if (!updatedDelivery) {
      throw new Error("La livraison a déjà été mise à jour. Actualisez la page.");
    }

    if (statut === "livree") {
      await tx
        .update(commandes)
        .set({ statut: "servie", heureServie: now, updatedAt: now })
        .where(
          and(
            eq(commandes.id, commandeId),
            eq(commandes.restaurantId, restaurant.id),
            eq(commandes.statut, "prete"),
          ),
        );
      if (livraison.livreurId) {
        await tx
          .update(livreurs)
          .set({
            nombreLivraisons: sql`${livreurs.nombreLivraisons} + 1`,
            updatedAt: now,
          })
          .where(eq(livreurs.id, livraison.livreurId));
      }
    } else {
      await tx
        .update(commandes)
        .set({ updatedAt: now })
        .where(
          and(
            eq(commandes.id, commandeId),
            eq(commandes.restaurantId, restaurant.id),
            eq(commandes.statut, "prete"),
          ),
        );
    }
    return updatedDelivery;
  });

  after(async () => {
    const effects: Promise<unknown>[] = [
      pushSseEvent(restaurant.id, "statut", {
        statut: statut === "livree" ? "servie" : "prete",
        commandeId,
        lienId: commandeId,
        timestamp: now.toISOString(),
      }),
    ];
    if (statut === "livree") effects.push(calculerCommissionCommande(commandeId));
    await Promise.allSettled(effects);
  });

  revalidatePath("/restaurateur/commandes");
  revalidatePath(`/restaurateur/commandes/${commandeId}`);
  return result;
}
