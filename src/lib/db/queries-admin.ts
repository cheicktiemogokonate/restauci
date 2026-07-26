import {
  and,
  count,
  desc,
  eq,
  gt,
  gte,
  isNull,
  isNotNull,
  ilike,
  inArray,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { cache } from "react";
import { db } from "./index";
import {
  auditLog,
  clients,
  commandes,
  commissions,
  paiements,
  restaurants,
  subscriptionPeriods,
  subscriptionPlans,
  subscriptionRequests,
  users,
} from "./schema";
import type { StatutCommande } from "./types";
import { withDatabaseReadRetry } from "./read-retry";

// ============================================================================
// RESTAURANTS — VUE ADMIN (toute la plateforme)
// ============================================================================

export interface GetRestaurantsAdminOptions {
  statut?: "en_attente" | "actif" | "suspendu" | "rejete" | "tous";
  search?: string;
  page?: number;
  limit?: number;
}

export async function getRestaurantsAdmin({
  statut = "tous",
  search,
  page = 1,
  limit = 20,
}: GetRestaurantsAdminOptions) {
  const conditions = [];

  if (statut === "en_attente") {
    conditions.push(eq(restaurants.actif, false));
    conditions.push(eq(restaurants.suspendu, false));
    conditions.push(isNull(restaurants.motifRejet));
  } else if (statut === "actif") {
    conditions.push(eq(restaurants.actif, true));
    conditions.push(eq(restaurants.suspendu, false));
  } else if (statut === "suspendu") {
    conditions.push(eq(restaurants.suspendu, true));
  } else if (statut === "rejete") {
    conditions.push(eq(restaurants.actif, false));
    conditions.push(eq(restaurants.suspendu, false));
    conditions.push(isNotNull(restaurants.motifRejet));
  }

  const normalizedSearch = search?.trim().slice(0, 100);
  if (normalizedSearch) {
    conditions.push(ilike(restaurants.nom, `%${normalizedSearch}%`));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (page - 1) * limit;
  const now = new Date();

  const activePeriods = db
    .select({
      restaurantId: subscriptionPeriods.restaurantId,
      planCode: subscriptionPeriods.planCode,
      statutAbonnement: subscriptionPeriods.statut,
      dateEcheance: subscriptionPeriods.dateEcheance,
      tauxCommissionBpsFige: subscriptionPeriods.tauxCommissionBpsFige,
    })
    .from(subscriptionPeriods)
    .where(
      and(
        eq(subscriptionPeriods.statut, "active"),
        lte(subscriptionPeriods.dateDebut, now),
        or(
          isNull(subscriptionPeriods.dateEcheance),
          gt(subscriptionPeriods.dateEcheance, now),
        ),
      ),
    )
    .as("active_subscription_periods");

  const [items, totalResult] = await withDatabaseReadRetry(() =>
    db.batch([
      db
        .select({
        id: restaurants.id,
        nom: restaurants.nom,
        slug: restaurants.slug,
        telephone: restaurants.telephone,
        ville: restaurants.ville,
        actif: restaurants.actif,
        suspendu: restaurants.suspendu,
        motifRejet: restaurants.motifRejet,
        enLigne: restaurants.enLigne,
        nombreCommandes: restaurants.nombreCommandes,
        noteMoyenne: restaurants.noteMoyenne,
        createdAt: restaurants.createdAt,
        userId: restaurants.userId,
        planCode: activePeriods.planCode,
        planNom: subscriptionPlans.nom,
        statutAbonnement: activePeriods.statutAbonnement,
        dateEcheance: activePeriods.dateEcheance,
        tauxCommissionBpsFige: activePeriods.tauxCommissionBpsFige,
      })
        .from(restaurants)
        .leftJoin(activePeriods, eq(activePeriods.restaurantId, restaurants.id))
        .leftJoin(subscriptionPlans, eq(subscriptionPlans.code, activePeriods.planCode))
        .where(whereClause)
        .orderBy(desc(restaurants.createdAt))
        .limit(limit)
        .offset(offset),

      db.select({ total: count() }).from(restaurants).where(whereClause),
    ]),
  );

  return {
    items,
    total: Number(totalResult[0]?.total ?? 0),
    page,
    totalPages: Math.ceil(Number(totalResult[0]?.total ?? 0) / limit),
  };
}

import { getEffectivePlan } from "@/lib/subscription-plans";
export async function getRestaurantDetailAdmin(id: string) {
  const [restaurant] = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.id, id))
    .limit(1);

  if (!restaurant) return null;

  const [proprietaire] = await db
    .select({ nom: users.nom, email: users.email, telephone: users.telephone })
    .from(users)
    .where(eq(users.id, restaurant.userId))
    .limit(1);

  const planInfo = await getEffectivePlan(id);

  const [pendingRequest] = await db
    .select()
    .from(subscriptionRequests)
    .where(and(eq(subscriptionRequests.restaurantId, id), eq(subscriptionRequests.statut, "en_attente")))
    .orderBy(desc(subscriptionRequests.createdAt))
    .limit(1);

  return {
    ...restaurant,
    proprietaire,
    effectivePlan: planInfo,
    pendingRequest: pendingRequest || null
  };
}

/** Compteurs pour les onglets de filtre */
export async function getRestaurantsCountsAdmin() {
  const result = await withDatabaseReadRetry(() =>
    db
      .select({
        enAttente: sql<number>`COUNT(*) FILTER (
          WHERE ${restaurants.actif} = false
            AND ${restaurants.suspendu} = false
            AND ${restaurants.motifRejet} IS NULL
        )`,
        actifs: sql<number>`COUNT(*) FILTER (WHERE ${restaurants.actif} = true AND ${restaurants.suspendu} = false)`,
        suspendus: sql<number>`COUNT(*) FILTER (WHERE ${restaurants.suspendu} = true)`,
        rejetes: sql<number>`COUNT(*) FILTER (
          WHERE ${restaurants.actif} = false
            AND ${restaurants.suspendu} = false
            AND ${restaurants.motifRejet} IS NOT NULL
        )`,
        total: count(),
      })
      .from(restaurants),
  );

  return result[0];
}

// ============================================================================
// COMMANDES D'UN RESTAURANT SPÉCIFIQUE (vue admin)
// ============================================================================

export interface GetCommandesRestaurantAdminOptions {
  restaurantId: string;
  statut?: StatutCommande;
  dateDebut?: Date;
  dateFin?: Date;
  page?: number;
  limit?: number;
}

export async function getCommandesRestaurantAdmin({
  restaurantId,
  statut,
  dateDebut,
  dateFin,
  page = 1,
  limit = 20,
}: GetCommandesRestaurantAdminOptions) {
  const conditions = [eq(commandes.restaurantId, restaurantId)];

  if (statut) conditions.push(eq(commandes.statut, statut));
  if (dateDebut) conditions.push(gte(commandes.createdAt, dateDebut));
  if (dateFin) conditions.push(lte(commandes.createdAt, dateFin));

  const offset = (page - 1) * limit;

  const [items, totalResult] = await Promise.all([
    db
      .select()
      .from(commandes)
      .where(and(...conditions))
      .orderBy(desc(commandes.createdAt))
      .limit(limit)
      .offset(offset),

    db
      .select({ total: count() })
      .from(commandes)
      .where(and(...conditions)),
  ]);

  return {
    items,
    total: Number(totalResult[0]?.total ?? 0),
    page,
    totalPages: Math.ceil(Number(totalResult[0]?.total ?? 0) / limit),
  };
}

/** Évolution des commandes d'UN restaurant sur N jours (pour le graphique admin) */
export async function getEvolutionRestaurantAdmin(
  restaurantId: string,
  jours = 30,
) {
  const dateDebut = new Date();
  dateDebut.setDate(dateDebut.getDate() - jours);

  return db
    .select({
      jour: sql<string>`DATE(${commandes.createdAt} AT TIME ZONE 'UTC')`,
      count: count(),
      total: sql<number>`COALESCE(SUM(${commandes.total}), 0)`,
    })
    .from(commandes)
    .where(
      and(
        eq(commandes.restaurantId, restaurantId),
        gte(commandes.createdAt, dateDebut),
      ),
    )
    .groupBy(sql`DATE(${commandes.createdAt} AT TIME ZONE 'UTC')`)
    .orderBy(sql`DATE(${commandes.createdAt} AT TIME ZONE 'UTC')`);
}

// ============================================================================
// COMMANDES — VUE GLOBALE PLATEFORME
// ============================================================================

export interface GetCommandesGlobalAdminOptions {
  restaurantId?: string;
  restaurantSearch?: string;
  statut?: StatutCommande;
  search?: string; // recherche par numéro ou nom client
  dateDebut?: Date;
  dateFin?: Date;
  page?: number;
  limit?: number;
  signal?: AdminSupportSignal;
}

export type AdminSupportSignal =
  | "stalled"
  | "payment_failed"
  | "refunded"
  | "cancelled_today";

export async function getCommandesGlobalAdmin({
  restaurantId,
  restaurantSearch,
  statut,
  search,
  dateDebut,
  dateFin,
  page = 1,
  limit = 25,
  signal,
}: GetCommandesGlobalAdminOptions) {
  const conditions = [];

  if (restaurantId) conditions.push(eq(commandes.restaurantId, restaurantId));
  const normalizedRestaurantSearch = restaurantSearch?.trim().slice(0, 100);
  if (normalizedRestaurantSearch) {
    conditions.push(ilike(restaurants.nom, `%${normalizedRestaurantSearch}%`));
  }
  if (statut) conditions.push(eq(commandes.statut, statut));
  if (dateDebut) conditions.push(gte(commandes.createdAt, dateDebut));
  if (dateFin) conditions.push(lte(commandes.createdAt, dateFin));
  const normalizedSearch = search?.trim().slice(0, 100);
  if (normalizedSearch) {
    conditions.push(
      or(
        ilike(commandes.numero, `%${normalizedSearch}%`),
        ilike(commandes.nomClient, `%${normalizedSearch}%`),
      ),
    );
  }
  if (signal === "stalled") {
    const stalledBefore = new Date();
    stalledBefore.setHours(stalledBefore.getHours() - 2);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    conditions.push(
      inArray(commandes.statut, ["recue", "en_preparation", "prete"]),
      lte(commandes.createdAt, stalledBefore),
      gte(commandes.createdAt, sevenDaysAgo),
    );
  } else if (signal === "payment_failed") {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM ${paiements}
        WHERE ${paiements.commandeId} = ${commandes.id}
          AND ${paiements.statut} = ${"echoue"}
          AND ${paiements.createdAt} >= ${thirtyDaysAgo}
      )`,
    );
  } else if (signal === "refunded") {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM ${paiements}
        WHERE ${paiements.commandeId} = ${commandes.id}
          AND ${paiements.statut} = ${"rembourse"}
          AND ${paiements.createdAt} >= ${thirtyDaysAgo}
      )`,
    );
  } else if (signal === "cancelled_today") {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    conditions.push(
      eq(commandes.statut, "annulee"),
      gte(commandes.createdAt, startOfToday),
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (page - 1) * limit;

  const [items, totalResult] = await withDatabaseReadRetry(() =>
    db.batch([
      db
        .select({
        id: commandes.id,
        numero: commandes.numero,
        statut: commandes.statut,
        total: commandes.total,
        modeCommande: commandes.modeCommande,
        nomClient: commandes.nomClient,
        createdAt: commandes.createdAt,
        restaurantId: commandes.restaurantId,
        restaurantNom: restaurants.nom,
        })
        .from(commandes)
        .innerJoin(restaurants, eq(commandes.restaurantId, restaurants.id))
        .where(whereClause)
        .orderBy(desc(commandes.createdAt))
        .limit(limit)
        .offset(offset),

      db
        .select({ total: count() })
        .from(commandes)
        .innerJoin(restaurants, eq(commandes.restaurantId, restaurants.id))
        .where(whereClause),
    ]),
  );

  return {
    items,
    total: Number(totalResult[0]?.total ?? 0),
    page,
    totalPages: Math.ceil(Number(totalResult[0]?.total ?? 0) / limit),
  };
}

/** Détail complet d'une commande, destiné à la consultation administrateur. */
export async function getCommandeDetailAdmin(commandeId: string) {
  const [commandRows, paymentRows] = await withDatabaseReadRetry(() =>
    db.batch([
      db
        .select({
          id: commandes.id,
          numero: commandes.numero,
          statut: commandes.statut,
          modeCommande: commandes.modeCommande,
          nomClient: commandes.nomClient,
          telephoneClient: commandes.telephoneClient,
          items: commandes.items,
          sousTotal: commandes.sousTotal,
          fraisLivraison: commandes.fraisLivraison,
          remise: commandes.remise,
          total: commandes.total,
          createdAt: commandes.createdAt,
          restaurantId: restaurants.id,
          restaurantNom: restaurants.nom,
          clientNom: clients.nom,
          clientTelephone: clients.telephone,
          commissionTauxBps: commissions.tauxCommissionBps,
          commissionMontant: commissions.montantCommission,
          commissionStatut: commissions.statut,
        })
        .from(commandes)
        .innerJoin(restaurants, eq(commandes.restaurantId, restaurants.id))
        .leftJoin(clients, eq(commandes.clientId, clients.id))
        .leftJoin(commissions, eq(commissions.commandeId, commandes.id))
        .where(eq(commandes.id, commandeId))
        .limit(1),
      db
        .select({
          paiementMontant: paiements.montant,
          paiementMethode: paiements.methode,
          paiementStatut: paiements.statut,
          paiementReference: paiements.referenceExterne,
          paiementPayeAt: paiements.payeAt,
        })
        .from(paiements)
        .where(eq(paiements.commandeId, commandeId))
        .orderBy(desc(paiements.createdAt))
        .limit(1),
    ]),
  );

  const commande = commandRows[0];
  if (!commande) return null;

  return {
    ...commande,
    paiementMontant: paymentRows[0]?.paiementMontant ?? null,
    paiementMethode: paymentRows[0]?.paiementMethode ?? null,
    paiementStatut: paymentRows[0]?.paiementStatut ?? null,
    paiementReference: paymentRows[0]?.paiementReference ?? null,
    paiementPayeAt: paymentRows[0]?.paiementPayeAt ?? null,
  };
}

export const getAdminSupportSummary = cache(async () => {
  const now = new Date();
  const stalledBefore = new Date(now);
  stalledBefore.setHours(stalledBefore.getHours() - 2);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const [summary] = await withDatabaseReadRetry(() =>
    db
      .select({
        stalledOrders: sql<number>`(
          SELECT COUNT(*) FROM ${commandes}
          WHERE ${commandes.statut} IN (${"recue"}, ${"en_preparation"}, ${"prete"})
            AND ${commandes.createdAt} >= ${sevenDaysAgo}
            AND ${commandes.createdAt} <= ${stalledBefore}
        )`,
        failedPayments: sql<number>`(
          SELECT COUNT(*) FROM ${paiements}
          WHERE ${paiements.statut} = ${"echoue"}
            AND ${paiements.createdAt} >= ${thirtyDaysAgo}
        )`,
        refundedPayments: sql<number>`(
          SELECT COUNT(*) FROM ${paiements}
          WHERE ${paiements.statut} = ${"rembourse"}
            AND ${paiements.createdAt} >= ${thirtyDaysAgo}
        )`,
        cancelledToday: sql<number>`(
          SELECT COUNT(*) FROM ${commandes}
          WHERE ${commandes.statut} = ${"annulee"}
            AND ${commandes.createdAt} >= ${startOfToday}
        )`,
      })
      .from(sql`(SELECT 1) AS admin_support_summary_source`),
  );

  return {
    stalledOrders: Number(summary?.stalledOrders ?? 0),
    failedPayments: Number(summary?.failedPayments ?? 0),
    refundedPayments: Number(summary?.refundedPayments ?? 0),
    cancelledToday: Number(summary?.cancelledToday ?? 0),
  };
});

// ============================================================================
// UTILISATEURS — VUE ADMIN
// ============================================================================

export interface GetUsersAdminOptions {
  role?: "restaurateur" | "admin" | "tous";
  search?: string;
  page?: number;
  limit?: number;
}

export async function getUsersAdmin({
  role = "tous",
  search,
  page = 1,
  limit = 20,
}: GetUsersAdminOptions) {
  const conditions = [];

  if (role !== "tous") conditions.push(eq(users.role, role));
  const normalizedSearch = search?.trim().slice(0, 100);
  if (normalizedSearch) {
    conditions.push(
      or(
        ilike(users.nom, `%${normalizedSearch}%`),
        ilike(users.email, `%${normalizedSearch}%`),
      ),
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (page - 1) * limit;
  const now = new Date();

  const activePeriods = db
    .select({
      restaurantId: subscriptionPeriods.restaurantId,
      planCode: subscriptionPeriods.planCode,
      statutAbonnement: subscriptionPeriods.statut,
      dateEcheance: subscriptionPeriods.dateEcheance,
    })
    .from(subscriptionPeriods)
    .where(
      and(
        eq(subscriptionPeriods.statut, "active"),
        lte(subscriptionPeriods.dateDebut, now),
        or(
          isNull(subscriptionPeriods.dateEcheance),
          gt(subscriptionPeriods.dateEcheance, now),
        ),
      ),
    )
    .as("active_user_subscription_periods");

  const [items, totalResult] = await withDatabaseReadRetry(() =>
    db.batch([
      db
        .select({
        id: users.id,
        nom: users.nom,
        email: users.email,
        telephone: users.telephone,
        role: users.role,
        suspendu: users.suspendu,
        createdAt: users.createdAt,
        restaurantId: restaurants.id,
        restaurantNom: restaurants.nom,
        planCode: activePeriods.planCode,
        planNom: subscriptionPlans.nom,
        statutAbonnement: activePeriods.statutAbonnement,
        dateEcheance: activePeriods.dateEcheance,
      })
        .from(users)
        .leftJoin(restaurants, eq(restaurants.userId, users.id))
        .leftJoin(activePeriods, eq(activePeriods.restaurantId, restaurants.id))
        .leftJoin(subscriptionPlans, eq(subscriptionPlans.code, activePeriods.planCode))
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset),

      db.select({ total: count() }).from(users).where(whereClause),
    ]),
  );

  return {
    items,
    total: Number(totalResult[0]?.total ?? 0),
    page,
    totalPages: Math.ceil(Number(totalResult[0]?.total ?? 0) / limit),
  };
}

export async function getClientsAdmin({
  search,
  page = 1,
  limit = 20,
}: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  const normalizedSearch = search?.trim().slice(0, 100);
  const conditions = normalizedSearch
    ? [
        or(
          ilike(clients.nom, `%${normalizedSearch}%`),
          ilike(clients.telephone, `%${normalizedSearch}%`),
        ),
      ]
    : [];

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (page - 1) * limit;

  const [items, totalResult] = await withDatabaseReadRetry(() =>
    db.batch([
      db
        .select({
          id: clients.id,
          nom: clients.nom,
          telephone: clients.telephone,
          email: clients.email,
          actif: clients.actif,
          nombreCommandes: clients.nombreCommandes,
          totalDepense: clients.totalDepense,
          createdAt: clients.createdAt,
        })
        .from(clients)
        .where(whereClause)
        .orderBy(desc(clients.createdAt))
        .limit(limit)
        .offset(offset),

      db.select({ total: count() }).from(clients).where(whereClause),
    ]),
  );

  return {
    items,
    total: Number(totalResult[0]?.total ?? 0),
    page,
    totalPages: Math.ceil(Number(totalResult[0]?.total ?? 0) / limit),
  };
}

// ============================================================================
// DASHBOARD ADMIN — KPIs GLOBAUX PLATEFORME
// ============================================================================

export async function getStatsGlobalAdmin() {
  const maintenant = new Date();
  const debutAujourdhui = new Date(maintenant);
  debutAujourdhui.setHours(0, 0, 0, 0);
  const debutMois = new Date(
    maintenant.getFullYear(),
    maintenant.getMonth(),
    1,
  );
  const debutMoisDernier = new Date(
    maintenant.getFullYear(),
    maintenant.getMonth() - 1,
    1,
  );
  const finMoisDernier = new Date(debutMois.getTime() - 1);

  // Une seule requête SQL remplace les huit appels HTTP indépendants qui
  // rendaient le dashboard fragile lors des coupures transitoires de Neon.
  const [stats] = await withDatabaseReadRetry(() =>
    db
      .select({
        restaurantsTotal: sql<number>`(SELECT COUNT(*) FROM ${restaurants})`,
        restaurantsActifs: sql<number>`(
          SELECT COUNT(*) FROM ${restaurants}
          WHERE ${restaurants.actif} = true AND ${restaurants.suspendu} = false
        )`,
        restaurantsEnAttente: sql<number>`(
          SELECT COUNT(*) FROM ${restaurants}
          WHERE ${restaurants.actif} = false AND ${restaurants.suspendu} = false
        )`,
        restaurantsSuspendus: sql<number>`(
          SELECT COUNT(*) FROM ${restaurants}
          WHERE ${restaurants.suspendu} = true
        )`,
        usersTotal: sql<number>`(
          SELECT COUNT(*) FROM ${users} WHERE ${users.role} = ${"restaurateur"}
        )`,
        clientsTotal: sql<number>`(SELECT COUNT(*) FROM ${clients})`,
        commandesAujourdhui: sql<number>`(
          SELECT COUNT(*) FROM ${commandes}
          WHERE ${commandes.createdAt} >= ${debutAujourdhui}
        )`,
        commandesMois: sql<number>`(
          SELECT COUNT(*) FROM ${commandes}
          WHERE ${commandes.createdAt} >= ${debutMois}
        )`,
        gmvMois: sql<number>`(
          SELECT COALESCE(SUM(${commandes.total}), 0) FROM ${commandes}
          WHERE ${commandes.createdAt} >= ${debutMois}
            AND ${commandes.statut}::text = ${"servie"}
        )`,
        gmvMoisDernier: sql<number>`(
          SELECT COALESCE(SUM(${commandes.total}), 0) FROM ${commandes}
          WHERE ${commandes.createdAt} >= ${debutMoisDernier}
            AND ${commandes.createdAt} <= ${finMoisDernier}
            AND ${commandes.statut}::text = ${"servie"}
        )`,
        commissionsEnAttente: sql<number>`(
          SELECT COALESCE(SUM(${commissions.montantCommission}), 0)
          FROM ${commissions}
          WHERE ${commissions.statut} = ${"en_attente"}
        )`,
      })
      .from(sql`(SELECT 1) AS admin_stats_source`),
  );

  const gmvMoisVal = Number(stats?.gmvMois ?? 0);
  const gmvMoisDernierVal = Number(stats?.gmvMoisDernier ?? 0);
  const croissanceGmv =
    gmvMoisDernierVal > 0
      ? Math.round(((gmvMoisVal - gmvMoisDernierVal) / gmvMoisDernierVal) * 100)
      : null;

  return {
    restaurants: {
      total: Number(stats?.restaurantsTotal ?? 0),
      actifs: Number(stats?.restaurantsActifs ?? 0),
      enAttente: Number(stats?.restaurantsEnAttente ?? 0),
      suspendus: Number(stats?.restaurantsSuspendus ?? 0),
    },
    usersTotal: Number(stats?.usersTotal ?? 0),
    clientsTotal: Number(stats?.clientsTotal ?? 0),
    commandesAujourdhui: Number(stats?.commandesAujourdhui ?? 0),
    commandesMois: Number(stats?.commandesMois ?? 0),
    gmvMois: gmvMoisVal,
    croissanceGmv,
    commissionsEnAttente: Number(stats?.commissionsEnAttente ?? 0),
  };
}

export const getPendingSubscriptionRequestsCount = cache(async () => {
  const [result] = await withDatabaseReadRetry(() =>
    db
      .select({ total: count() })
      .from(subscriptionRequests)
      .where(eq(subscriptionRequests.statut, "en_attente")),
  );

  return Number(result?.total ?? 0);
});

export const getAdminActionCenterSummary = cache(async () => {
  const now = new Date();
  const subscriptionDeadline = new Date(now);
  subscriptionDeadline.setDate(subscriptionDeadline.getDate() + 30);

  const [summary] = await withDatabaseReadRetry(() =>
    db
      .select({
        pendingRestaurants: sql<number>`(
          SELECT COUNT(*) FROM ${restaurants}
          WHERE ${restaurants.actif} = false
            AND ${restaurants.suspendu} = false
            AND ${restaurants.motifRejet} IS NULL
        )`,
        pendingSubscriptions: sql<number>`(
          SELECT COUNT(*) FROM ${subscriptionRequests}
          WHERE ${subscriptionRequests.statut} = ${"en_attente"}
        )`,
        expiringSubscriptions: sql<number>`(
          SELECT COUNT(*) FROM ${subscriptionPeriods}
          WHERE ${subscriptionPeriods.statut} = ${"active"}
            AND ${subscriptionPeriods.planCode} <> ${"decouverte"}
            AND ${subscriptionPeriods.dateEcheance} IS NOT NULL
            AND ${subscriptionPeriods.dateEcheance} >= ${now}
            AND ${subscriptionPeriods.dateEcheance} <= ${subscriptionDeadline}
        )`,
        commissionRestaurants: sql<number>`(
          SELECT COUNT(DISTINCT ${commissions.restaurantId})
          FROM ${commissions}
          WHERE ${commissions.statut} = ${"en_attente"}
        )`,
        commissionsAmount: sql<number>`(
          SELECT COALESCE(SUM(${commissions.montantCommission}), 0)
          FROM ${commissions}
          WHERE ${commissions.statut} = ${"en_attente"}
        )`,
      })
      .from(sql`(SELECT 1) AS admin_action_center_source`),
  );

  const pendingRestaurants = Number(summary?.pendingRestaurants ?? 0);
  const pendingSubscriptions = Number(summary?.pendingSubscriptions ?? 0);
  const expiringSubscriptions = Number(summary?.expiringSubscriptions ?? 0);

  return {
    pendingRestaurants,
    pendingSubscriptions,
    expiringSubscriptions,
    commissionRestaurants: Number(summary?.commissionRestaurants ?? 0),
    commissionsAmount: Number(summary?.commissionsAmount ?? 0),
    requiredActions:
      pendingRestaurants + pendingSubscriptions + expiringSubscriptions,
  };
});

/** Évolution plateforme entière sur N jours (graphique dashboard admin) */
export async function getEvolutionPlateformeAdmin(jours = 30) {
  const dateDebut = new Date();
  dateDebut.setDate(dateDebut.getDate() - jours);

  return withDatabaseReadRetry(() =>
    db
      .select({
        jour: sql<string>`DATE(${commandes.createdAt} AT TIME ZONE 'UTC')`,
        count: count(),
        gmv: sql<number>`COALESCE(SUM(${commandes.total}), 0)`,
      })
      .from(commandes)
      .where(gte(commandes.createdAt, dateDebut))
      .groupBy(sql`DATE(${commandes.createdAt} AT TIME ZONE 'UTC')`)
      .orderBy(sql`DATE(${commandes.createdAt} AT TIME ZONE 'UTC')`),
  );
}

// ============================================================================
// COMMISSIONS
// ============================================================================

export interface GetCommissionsAdminOptions {
  restaurantId?: string;
  restaurantSearch?: string;
  statut?: "en_attente" | "payee" | "annulee" | "tous";
  dateDebut?: Date;
  dateFin?: Date;
  page?: number;
  limit?: number;
}

export async function getCommissionsAdmin({
  restaurantId,
  restaurantSearch,
  statut = "tous",
  dateDebut,
  dateFin,
  page = 1,
  limit = 20,
}: GetCommissionsAdminOptions) {
  const conditions = [];
  if (restaurantId) conditions.push(eq(commissions.restaurantId, restaurantId));
  if (statut !== "tous") conditions.push(eq(commissions.statut, statut));
  if (dateDebut) conditions.push(gte(commissions.createdAt, dateDebut));
  if (dateFin) conditions.push(lte(commissions.createdAt, dateFin));
  const normalizedRestaurantSearch = restaurantSearch?.trim().slice(0, 100);
  if (normalizedRestaurantSearch) {
    conditions.push(ilike(restaurants.nom, `%${normalizedRestaurantSearch}%`));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (page - 1) * limit;

  const [items, totalResult, summaryResult] = await withDatabaseReadRetry(() =>
    db.batch([
      db
        .select({
        id: commissions.id,
        commandeId: commissions.commandeId,
        restaurantId: commissions.restaurantId,
        montantCommande: commissions.montantCommande,
        tauxCommissionBps: commissions.tauxCommissionBps,
        montantCommission: commissions.montantCommission,
        statut: commissions.statut,
        payeeAt: commissions.payeeAt,
        settlementId: commissions.settlementId,
        createdAt: commissions.createdAt,
        restaurantNom: restaurants.nom,
      })
        .from(commissions)
        .innerJoin(restaurants, eq(commissions.restaurantId, restaurants.id))
        .where(whereClause)
        .orderBy(desc(commissions.createdAt))
        .limit(limit)
        .offset(offset),

      db
        .select({ total: count() })
        .from(commissions)
        .innerJoin(restaurants, eq(commissions.restaurantId, restaurants.id))
        .where(whereClause),
      db
        .select({
          montantTotal: sql<number>`COALESCE(SUM(${commissions.montantCommission}), 0)`,
          restaurantsTotal: sql<number>`COUNT(DISTINCT ${commissions.restaurantId})`,
        })
        .from(commissions)
        .innerJoin(restaurants, eq(commissions.restaurantId, restaurants.id))
        .where(whereClause),
    ]),
  );

  const total = Number(totalResult[0]?.total ?? 0);
  return {
    items,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    summary: {
      montantTotal: Number(summaryResult[0]?.montantTotal ?? 0),
      restaurantsTotal: Number(summaryResult[0]?.restaurantsTotal ?? 0),
      commandesTotal: total,
    },
  };
}

/** Montant total dû par restaurant (regroupé) — pour la vue "qui doit quoi" */
export async function getCommissionsParRestaurantAdmin() {
  return withDatabaseReadRetry(() =>
    db
      .select({
        restaurantId: commissions.restaurantId,
        restaurantNom: restaurants.nom,
        montantDu: sql<number>`COALESCE(SUM(${commissions.montantCommission}), 0)`,
        nombreCommandes: count(),
      })
      .from(commissions)
      .innerJoin(restaurants, eq(commissions.restaurantId, restaurants.id))
      .where(eq(commissions.statut, "en_attente"))
      .groupBy(commissions.restaurantId, restaurants.nom)
      .orderBy(desc(sql`SUM(${commissions.montantCommission})`)),
  );
}

// ============================================================================
// AUDIT LOG
// ============================================================================

export async function getAuditLogAdmin({
  ressourceType,
  ressourceId,
  page = 1,
  limit = 50,
}: {
  ressourceType?: string;
  ressourceId?: string;
  page?: number;
  limit?: number;
}) {
  const conditions = [];
  if (ressourceType) conditions.push(eq(auditLog.ressourceType, ressourceType));
  if (ressourceId) conditions.push(eq(auditLog.ressourceId, ressourceId));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (page - 1) * limit;

  const [items, totalRows] = await withDatabaseReadRetry(() =>
    db.batch([
      db
        .select({
          id: auditLog.id,
          adminId: auditLog.adminId,
          adminNom: users.nom,
          action: auditLog.action,
          ressourceType: auditLog.ressourceType,
          ressourceId: auditLog.ressourceId,
          details: auditLog.details,
          createdAt: auditLog.createdAt,
        })
        .from(auditLog)
        .innerJoin(users, eq(auditLog.adminId, users.id))
        .where(whereClause)
        .orderBy(desc(auditLog.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(auditLog).where(whereClause),
    ]),
  );

  const total = Number(totalRows[0]?.total ?? 0);
  return {
    items,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export type AdminRestaurantDetail = NonNullable<
  Awaited<ReturnType<typeof getRestaurantDetailAdmin>>
>;
export type AdminRestaurantOrder =
  Awaited<ReturnType<typeof getCommandesRestaurantAdmin>>["items"][number];
