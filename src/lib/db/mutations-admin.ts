import { transactionalDb } from "./transaction";
import { eq, and, isNull } from "drizzle-orm";
import {
  restaurants,
  partnerAccounts,
  users,
  clients,
} from "./schema";
import { invalidateCache, cacheKey, invalidateRestaurantCache } from "@/lib/cache";
import { persistAuditLog } from "@/lib/audit";
import { sendNotification } from "@/lib/notifications";
import { env } from "@/lib/env";
import { getServiceMarketCapability } from "@/modules/service-markets/server";


export class AdminTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminTransitionError";
  }
}

async function getRestaurantOwnerUserId(partnerAccountId: string) {
  const account = await transactionalDb.query.partnerAccounts.findFirst({
    where: eq(partnerAccounts.id, partnerAccountId),
    columns: { userId: true },
  });
  if (!account) throw new Error("Compte partenaire introuvable");
  return account.userId;
}

// ============================================================================
// VALIDATION / REJET DE RESTAURANT
// ============================================================================

// Les mutations sensibles utilisent le pool transactionnel : l'audit métier
// obligatoire est validé dans le même COMMIT que la transition administrateur.

export async function validerRestaurant(
  restaurantId: string,
  adminId:      string
) {
  const restaurant = await transactionalDb.transaction(async (tx) => {
    if (env.RESTAURANT_GEO_POLICY_MODE === "enforce") {
      const candidate = await tx.query.restaurants.findFirst({
        where: eq(restaurants.id, restaurantId),
        columns: {
          serviceMarketId: true,
          serviceMarketVersionId: true,
          geoAssignmentStatus: true,
        },
      });
      if (
        !candidate?.serviceMarketId ||
        !candidate.serviceMarketVersionId ||
        candidate.geoAssignmentStatus !== "assigned"
      ) {
        throw new AdminTransitionError(
          "Le restaurant doit être affecté sans ambiguïté à un marché avant sa validation.",
        );
      }
      const capability = await getServiceMarketCapability(
        candidate.serviceMarketId,
        "restaurant",
        tx,
      );
      if (capability?.status !== "active") {
        throw new AdminTransitionError(
          "L'activité Restaurants n'est pas active dans le marché affecté.",
        );
      }
    }
    const [updated] = await tx.update(restaurants).set({
        actif: true, valideParUserId: adminId, valideAt: new Date(),
        motifRejet: null, updatedAt: new Date(),
      }).where(and(
        eq(restaurants.id, restaurantId), eq(restaurants.actif, false),
        eq(restaurants.suspendu, false), isNull(restaurants.motifRejet),
      )).returning();
    if (!updated) throw new AdminTransitionError("Seul un restaurant en attente peut être validé.");
    await persistAuditLog(tx, {
      adminId, action: "restaurant_valide", ressourceType: "restaurant", ressourceId: restaurantId,
    });
    return updated;
  });
  const ownerUserId = await getRestaurantOwnerUserId(restaurant.partnerAccountId);

  await invalidateCache(
    cacheKey.restaurant(restaurantId),
    cacheKey.restaurantByUser(ownerUserId),
  );
  await invalidateRestaurantCache(restaurant.id, restaurant.slug);

  await sendNotification({
    userId: ownerUserId,
    restaurantId: restaurant.id,
    type: "restaurant_valide",
    titre: "Votre restaurant est validé",
    message: `Bonne nouvelle ! ${restaurant.nom} a été validé. Vous pouvez maintenant finaliser votre configuration et commencer votre activité.`,
    lienType: "restaurant",
    lienId: restaurant.id,
    data: { statut: "valide" },
  });

  return restaurant;
}

export async function rejeterRestaurant(
  restaurantId: string,
  adminId:      string,
  motif:        string
) {
  const restaurant = await transactionalDb.transaction(async (tx) => {
    const [updated] = await tx.update(restaurants)
      .set({ actif: false, motifRejet: motif, updatedAt: new Date() })
      .where(and(
        eq(restaurants.id, restaurantId), eq(restaurants.actif, false),
        eq(restaurants.suspendu, false), isNull(restaurants.motifRejet),
      )).returning();
    if (!updated) throw new AdminTransitionError("Seul un restaurant en attente peut être rejeté.");
    await persistAuditLog(tx, {
      adminId, action: "restaurant_rejete", ressourceType: "restaurant",
      ressourceId: restaurantId, details: { motif },
    });
    return updated;
  });
  const ownerUserId = await getRestaurantOwnerUserId(restaurant.partnerAccountId);

  await invalidateCache(
    cacheKey.restaurant(restaurantId),
    cacheKey.restaurantByUser(ownerUserId),
  );
  await invalidateRestaurantCache(restaurant.id, restaurant.slug);

  await sendNotification({
    userId: ownerUserId,
    restaurantId: restaurant.id,
    type: "restaurant_rejete",
    titre: "Votre dossier nécessite des corrections",
    message: `Votre demande pour ${restaurant.nom} a été refusée. Motif : ${motif}`,
    lienType: "profil",
    lienId: restaurant.id,
    data: { statut: "rejete", motif },
  });

  return restaurant;
}

// ============================================================================
// SUSPENSION / RÉACTIVATION RESTAURANT
// ============================================================================

export async function suspendreRestaurant(
  restaurantId: string,
  adminId:      string,
  motif:        string
) {
  const restaurant = await transactionalDb.transaction(async (tx) => {
    const [updated] = await tx.update(restaurants).set({
        suspendu: true, motifSuspension: motif, enLigne: false,
        accepteCommandes: false, updatedAt: new Date(),
      }).where(and(
        eq(restaurants.id, restaurantId), eq(restaurants.actif, true),
        eq(restaurants.suspendu, false),
      )).returning();
    if (!updated) throw new AdminTransitionError("Seul un restaurant actif peut être suspendu.");
    await persistAuditLog(tx, {
      adminId, action: "restaurant_suspendu", ressourceType: "restaurant",
      ressourceId: restaurantId, details: { motif },
    });
    return updated;
  });
  const ownerUserId = await getRestaurantOwnerUserId(restaurant.partnerAccountId);

  await invalidateCache(
    cacheKey.restaurant(restaurantId),
    cacheKey.restaurantByUser(ownerUserId),
  );
  await invalidateRestaurantCache(restaurant.id, restaurant.slug);

  return restaurant;
}

export async function reactiverRestaurant(
  restaurantId: string,
  adminId:      string
) {
  const restaurant = await transactionalDb.transaction(async (tx) => {
    const [updated] = await tx.update(restaurants)
      .set({ suspendu: false, motifSuspension: null, updatedAt: new Date() })
      .where(and(
        eq(restaurants.id, restaurantId), eq(restaurants.actif, true),
        eq(restaurants.suspendu, true),
      )).returning();
    if (!updated) throw new AdminTransitionError("Seul un restaurant suspendu peut être réactivé.");
    await persistAuditLog(tx, {
      adminId, action: "restaurant_reactive", ressourceType: "restaurant", ressourceId: restaurantId,
    });
    return updated;
  });
  const ownerUserId = await getRestaurantOwnerUserId(restaurant.partnerAccountId);

  await invalidateCache(
    cacheKey.restaurant(restaurantId),
    cacheKey.restaurantByUser(ownerUserId),
  );
  await invalidateRestaurantCache(restaurant.id, restaurant.slug);

  return restaurant;
}

// ============================================================================
// SUSPENSION UTILISATEURS / CLIENTS
// ============================================================================

export async function suspendreUser(
  userId:  string,
  adminId: string,
  motif:   string
) {
  return transactionalDb.transaction(async (tx) => {
    const [user] = await tx.update(users).set({
        suspendu: true, motifSuspension: motif, suspenduAt: new Date(), updatedAt: new Date(),
      }).where(and(
        eq(users.id, userId), eq(users.role, "partner"), eq(users.suspendu, false),
      )).returning();
    if (!user) throw new AdminTransitionError("Seul un restaurateur actif peut être suspendu.");
    await persistAuditLog(tx, {
      adminId, action: "user_suspendu", ressourceType: "user",
      ressourceId: userId, details: { motif },
    });
    return user;
  });
}

export async function reactiverUser(userId: string, adminId: string) {
  return transactionalDb.transaction(async (tx) => {
    const [user] = await tx.update(users).set({
        suspendu: false, motifSuspension: null, suspenduAt: null, updatedAt: new Date(),
      }).where(and(
        eq(users.id, userId), eq(users.role, "partner"), eq(users.suspendu, true),
      )).returning();
    if (!user) throw new AdminTransitionError("Seul un restaurateur suspendu peut être réactivé.");
    await persistAuditLog(tx, {
      adminId, action: "user_reactive", ressourceType: "user", ressourceId: userId,
    });
    return user;
  });
}

export async function suspendreClient(
  clientId: string,
  adminId:  string,
  motif:    string
) {
  return transactionalDb.transaction(async (tx) => {
    const [client] = await tx.update(clients).set({
        actif: false, motifSuspension: motif, suspenduAt: new Date(), updatedAt: new Date(),
      }).where(and(eq(clients.id, clientId), eq(clients.actif, true))).returning();
    if (!client) throw new AdminTransitionError("Seul un client actif peut être suspendu.");
    await persistAuditLog(tx, {
      adminId, action: "client_suspendu", ressourceType: "client",
      ressourceId: clientId, details: { motif },
    });
    return client;
  });
}

export async function reactiverClient(clientId: string, adminId: string) {
  return transactionalDb.transaction(async (tx) => {
    const [client] = await tx.update(clients).set({
        actif: true, motifSuspension: null, suspenduAt: null, updatedAt: new Date(),
      }).where(and(eq(clients.id, clientId), eq(clients.actif, false))).returning();
    if (!client) throw new AdminTransitionError("Seul un client suspendu peut être réactivé.");
    await persistAuditLog(tx, {
      adminId, action: "client_reactive", ressourceType: "client", ressourceId: clientId,
    });
    return client;
  });
}
