import { db }   from "./index";
import { eq, and, sql } from "drizzle-orm";
import {
  restaurants,
  users,
  clients,
  commandes,
  commissions,
} from "./schema";
import { logAuditAction } from "@/lib/audit";
import { invalidateCache, cacheKey } from "@/lib/cache";

// ============================================================================
// VALIDATION / REJET DE RESTAURANT
// ============================================================================

export async function validerRestaurant(
  restaurantId: string,
  adminId:      string
) {
  const [restaurant] = await db
    .update(restaurants)
    .set({
      actif:           true,
      valideParUserId: adminId,
      valideAt:        new Date(),
      motifRejet:      null,
      updatedAt:       new Date(),
    })
    .where(eq(restaurants.id, restaurantId))
    .returning();

  await logAuditAction({
    adminId,
    action:        "restaurant_valide",
    ressourceType: "restaurant",
    ressourceId:   restaurantId,
  });

  await invalidateCache(cacheKey.restaurant(restaurantId));

  return restaurant;
}

export async function rejeterRestaurant(
  restaurantId: string,
  adminId:      string,
  motif:        string
) {
  const [restaurant] = await db
    .update(restaurants)
    .set({
      actif:      false,
      motifRejet: motif,
      updatedAt:  new Date(),
    })
    .where(eq(restaurants.id, restaurantId))
    .returning();

  await logAuditAction({
    adminId,
    action:        "restaurant_rejete",
    ressourceType: "restaurant",
    ressourceId:   restaurantId,
    details:       { motif },
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
  const [restaurant] = await db
    .update(restaurants)
    .set({
      suspendu:         true,
      motifSuspension:  motif,
      enLigne:          false,  // forcer hors ligne
      accepteCommandes: false,  // bloquer les nouvelles commandes
      updatedAt:        new Date(),
    })
    .where(eq(restaurants.id, restaurantId))
    .returning();

  await logAuditAction({
    adminId,
    action:        "restaurant_suspendu",
    ressourceType: "restaurant",
    ressourceId:   restaurantId,
    details:       { motif },
  });

  await invalidateCache(cacheKey.restaurant(restaurantId));

  return restaurant;
}

export async function reactiverRestaurant(
  restaurantId: string,
  adminId:      string
) {
  const [restaurant] = await db
    .update(restaurants)
    .set({
      suspendu:        false,
      motifSuspension: null,
      updatedAt:       new Date(),
    })
    .where(eq(restaurants.id, restaurantId))
    .returning();

  await logAuditAction({
    adminId,
    action:        "restaurant_reactive",
    ressourceType: "restaurant",
    ressourceId:   restaurantId,
  });

  await invalidateCache(cacheKey.restaurant(restaurantId));

  return restaurant;
}

// ============================================================================
// MODIFIER LE TAUX DE COMMISSION
// ============================================================================

export async function modifierTauxCommission(
  restaurantId:  string,
  adminId:       string,
  nouveauTauxBps: number
) {
  const [ancien] = await db
    .select({ tauxCommissionBps: restaurants.tauxCommissionBps })
    .from(restaurants)
    .where(eq(restaurants.id, restaurantId))
    .limit(1);

  const [restaurant] = await db
    .update(restaurants)
    .set({ tauxCommissionBps: nouveauTauxBps, updatedAt: new Date() })
    .where(eq(restaurants.id, restaurantId))
    .returning();

  await logAuditAction({
    adminId,
    action:        "commission_modifiee",
    ressourceType: "restaurant",
    ressourceId:   restaurantId,
    details: {
      ancienTauxBps:   ancien?.tauxCommissionBps,
      nouveauTauxBps,
    },
  });

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
  const [user] = await db
    .update(users)
    .set({
      suspendu:        true,
      motifSuspension: motif,
      suspenduAt:      new Date(),
      updatedAt:       new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  await logAuditAction({
    adminId,
    action:        "user_suspendu",
    ressourceType: "user",
    ressourceId:   userId,
    details:       { motif },
  });

  return user;
}

export async function reactiverUser(userId: string, adminId: string) {
  const [user] = await db
    .update(users)
    .set({
      suspendu:        false,
      motifSuspension: null,
      suspenduAt:      null,
      updatedAt:       new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  await logAuditAction({
    adminId,
    action:        "user_reactive",
    ressourceType: "user",
    ressourceId:   userId,
  });

  return user;
}

export async function suspendreClient(
  clientId: string,
  adminId:  string,
  motif:    string
) {
  const [client] = await db
    .update(clients)
    .set({
      actif:           false,
      motifSuspension: motif,
      suspenduAt:      new Date(),
      updatedAt:       new Date(),
    })
    .where(eq(clients.id, clientId))
    .returning();

  await logAuditAction({
    adminId,
    action:        "client_suspendu",
    ressourceType: "client",
    ressourceId:   clientId,
    details:       { motif },
  });

  return client;
}

export async function reactiverClient(clientId: string, adminId: string) {
  const [client] = await db
    .update(clients)
    .set({
      actif:           true,
      motifSuspension: null,
      suspenduAt:      null,
      updatedAt:       new Date(),
    })
    .where(eq(clients.id, clientId))
    .returning();

  await logAuditAction({
    adminId,
    action:        "client_reactive",
    ressourceType: "client",
    ressourceId:   clientId,
  });

  return client;
}

// ============================================================================
// CALCUL DES COMMISSIONS
// ============================================================================

/**
 * Calcule et enregistre la commission d'une commande.
 * À appeler quand une commande passe au statut "servie".
 */
export async function calculerCommissionCommande(commandeId: string) {
  const [commande] = await db
    .select({
      id:           commandes.id,
      restaurantId: commandes.restaurantId,
      total:        commandes.total,
    })
    .from(commandes)
    .where(eq(commandes.id, commandeId))
    .limit(1);

  if (!commande) return null;

  const [restaurant] = await db
    .select({ tauxCommissionBps: restaurants.tauxCommissionBps })
    .from(restaurants)
    .where(eq(restaurants.id, commande.restaurantId))
    .limit(1);

  const tauxBps = restaurant?.tauxCommissionBps ?? 1000; // 10% par défaut
  const montantCommission = Math.round((commande.total * tauxBps) / 10000);

  const [commission] = await db
    .insert(commissions)
    .values({
      commandeId:        commande.id,
      restaurantId:       commande.restaurantId,
      montantCommande:    commande.total,
      tauxCommissionBps:  tauxBps,
      montantCommission,
    })
    .onConflictDoNothing() // évite les doublons si appelé 2x
    .returning();

  return commission;
}

export async function marquerCommissionsPayees(
  restaurantId: string,
  adminId:      string,
  commissionIds: string[]
) {
  await db
    .update(commissions)
    .set({
      statut:         "payee",
      payeeAt:        new Date(),
      payeeParUserId: adminId,
    })
    .where(
      and(
        eq(commissions.restaurantId, restaurantId),
        sql`${commissions.id} = ANY(${commissionIds})`
      )
    );

  await logAuditAction({
    adminId,
    action:        "commission_modifiee",
    ressourceType: "commission",
    ressourceId:   restaurantId,
    details:       { commissionIds, action: "marquees_payees" },
  });
}
