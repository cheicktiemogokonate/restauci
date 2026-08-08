import { db }   from "./index";
import { eq, and, inArray, isNull } from "drizzle-orm";
import {
  restaurants,
  users,
  clients,
  commandes,
  commissions,
  auditLog,
 commissionSettlements,
} from "./schema";
import { invalidateCache, cacheKey } from "@/lib/cache";
import { normalizeSettlementInput } from "@/lib/config/admin-workflows";
import { logAuditAction } from "@/lib/audit";


export class AdminTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminTransitionError";
  }
}

// ============================================================================
// VALIDATION / REJET DE RESTAURANT
// ============================================================================

// Le projet utilise drizzle-orm/neon-http, qui rejette les transactions
// interactives db.transaction(callback). Les transitions restent atomiques au
// niveau de l'UPDATE conditionnel ; le journal d'audit est volontairement
// best-effort afin qu'une panne d'observabilité n'annule pas l'action métier.

export async function validerRestaurant(
  restaurantId: string,
  adminId:      string
) {
  const [restaurant] = await db
    .update(restaurants)
    .set({
      actif: true,
      valideParUserId: adminId,
      valideAt: new Date(),
      motifRejet: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(restaurants.id, restaurantId),
        eq(restaurants.actif, false),
        eq(restaurants.suspendu, false),
        isNull(restaurants.motifRejet),
      ),
    )
    .returning();

  if (!restaurant) {
    throw new AdminTransitionError(
      "Seul un restaurant en attente peut être validé.",
    );
  }

  await logAuditAction({
    adminId,
    action: "restaurant_valide",
    ressourceType: "restaurant",
    ressourceId: restaurantId,
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
    .set({ actif: false, motifRejet: motif, updatedAt: new Date() })
    .where(
      and(
        eq(restaurants.id, restaurantId),
        eq(restaurants.actif, false),
        eq(restaurants.suspendu, false),
        isNull(restaurants.motifRejet),
      ),
    )
    .returning();

  if (!restaurant) {
    throw new AdminTransitionError(
      "Seul un restaurant en attente peut être rejeté.",
    );
  }

  await logAuditAction({
    adminId,
    action: "restaurant_rejete",
    ressourceType: "restaurant",
    ressourceId: restaurantId,
    details: { motif },
  });

  await invalidateCache(cacheKey.restaurant(restaurantId));

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
      suspendu: true,
      motifSuspension: motif,
      enLigne: false,
      accepteCommandes: false,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(restaurants.id, restaurantId),
        eq(restaurants.actif, true),
        eq(restaurants.suspendu, false),
      ),
    )
    .returning();

  if (!restaurant) {
    throw new AdminTransitionError(
      "Seul un restaurant actif peut être suspendu.",
    );
  }

  await logAuditAction({
    adminId,
    action: "restaurant_suspendu",
    ressourceType: "restaurant",
    ressourceId: restaurantId,
    details: { motif },
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
    .set({ suspendu: false, motifSuspension: null, updatedAt: new Date() })
    .where(
      and(
        eq(restaurants.id, restaurantId),
        eq(restaurants.actif, true),
        eq(restaurants.suspendu, true),
      ),
    )
    .returning();

  if (!restaurant) {
    throw new AdminTransitionError(
      "Seul un restaurant suspendu peut être réactivé.",
    );
  }

  await logAuditAction({
    adminId,
    action: "restaurant_reactive",
    ressourceType: "restaurant",
    ressourceId: restaurantId,
  });

  await invalidateCache(cacheKey.restaurant(restaurantId));

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
      suspendu: true,
      motifSuspension: motif,
      suspenduAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(users.id, userId),
        eq(users.role, "restaurateur"),
        eq(users.suspendu, false),
      ),
    )
    .returning();

  if (!user) {
    throw new AdminTransitionError(
      "Seul un restaurateur actif peut être suspendu.",
    );
  }

  await logAuditAction({
    adminId,
    action: "user_suspendu",
    ressourceType: "user",
    ressourceId: userId,
    details: { motif },
  });

  return user;
}

export async function reactiverUser(userId: string, adminId: string) {
  const [user] = await db
    .update(users)
    .set({
      suspendu: false,
      motifSuspension: null,
      suspenduAt: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(users.id, userId),
        eq(users.role, "restaurateur"),
        eq(users.suspendu, true),
      ),
    )
    .returning();

  if (!user) {
    throw new AdminTransitionError(
      "Seul un restaurateur suspendu peut être réactivé.",
    );
  }

  await logAuditAction({
    adminId,
    action: "user_reactive",
    ressourceType: "user",
    ressourceId: userId,
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
      actif: false,
      motifSuspension: motif,
      suspenduAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(clients.id, clientId), eq(clients.actif, true)))
    .returning();

  if (!client) {
    throw new AdminTransitionError(
      "Seul un client actif peut être suspendu.",
    );
  }

  await logAuditAction({
    adminId,
    action: "client_suspendu",
    ressourceType: "client",
    ressourceId: clientId,
    details: { motif },
  });

  return client;
}

export async function reactiverClient(clientId: string, adminId: string) {
  const [client] = await db
    .update(clients)
    .set({
      actif: true,
      motifSuspension: null,
      suspenduAt: null,
      updatedAt: new Date(),
    })
    .where(and(eq(clients.id, clientId), eq(clients.actif, false)))
    .returning();

  if (!client) {
    throw new AdminTransitionError(
      "Seul un client suspendu peut être réactivé.",
    );
  }

  await logAuditAction({
    adminId,
    action: "client_reactive",
    ressourceType: "client",
    ressourceId: clientId,
  });

  return client;
}

// ============================================================================
// CALCUL DES COMMISSIONS
// ============================================================================

import { getCommissionRateBps } from "@/lib/subscription-plans";

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

  const tauxBps = await getCommissionRateBps(commande.restaurantId);
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

export async function marquerCommissionsRestaurantPayees(
  restaurantId: string,
  adminId: string,
  referenceReglement: string,
  notes?: string
) {
  let normalizedSettlement: ReturnType<typeof normalizeSettlementInput>;
  try {
    normalizedSettlement = normalizeSettlementInput(referenceReglement, notes);
  } catch (error) {
    throw new AdminTransitionError(
      error instanceof Error ? error.message : "Règlement invalide.",
    );
  }
  const { reference, notes: notesNettoyees } = normalizedSettlement;

  return db.transaction(async (tx) => {
    const commissionsPayees = await tx
      .update(commissions)
      .set({
        statut: "payee",
        payeeAt: new Date(),
        payeeParUserId: adminId,
      })
      .where(
        and(
          eq(commissions.restaurantId, restaurantId),
          eq(commissions.statut, "en_attente"),
        ),
      )
      .returning({ id: commissions.id, montant: commissions.montantCommission });

    if (commissionsPayees.length === 0) {
      throw new AdminTransitionError(
        "Aucune commission en attente pour ce restaurant.",
      );
    }

    const montantTotal = commissionsPayees.reduce(
      (total, commission) => total + commission.montant,
      0,
    );

    // Enregistrer le règlement groupé
    const [settlement] = await tx.insert(commissionSettlements).values({
      restaurantId,
      adminId,
      montantTotal,
      nombreCommissions: commissionsPayees.length,
      referenceReglement: reference,
      notes: notesNettoyees,
    }).returning();

    await tx
      .update(commissions)
      .set({ settlementId: settlement.id })
      .where(
        inArray(
          commissions.id,
          commissionsPayees.map((commission) => commission.id),
        ),
      );

    await tx.insert(auditLog).values({
      adminId,
      action: "commissions_encaissees",
      ressourceType: "commission",
      ressourceId: restaurantId,
      details: {
        action: "marquees_payees",
        commissionIds: commissionsPayees.map((commission) => commission.id),
        montantTotal,
        settlementId: settlement.id,
        referenceReglement: reference,
      },
    });

    return { nombre: commissionsPayees.length, montantTotal };
  });
}
