import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  like,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { db } from "./index";
import {
  auditLog,
  clients,
  commandes,
  commissions,
  restaurants,
  users,
} from "./schema";
import type { StatutCommande } from "./types";

// ============================================================================
// RESTAURANTS — VUE ADMIN (toute la plateforme)
// ============================================================================

export interface GetRestaurantsAdminOptions {
  statut?: "en_attente" | "actif" | "suspendu" | "tous";
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
  } else if (statut === "actif") {
    conditions.push(eq(restaurants.actif, true));
    conditions.push(eq(restaurants.suspendu, false));
  } else if (statut === "suspendu") {
    conditions.push(eq(restaurants.suspendu, true));
  }

  if (search) {
    conditions.push(like(restaurants.nom, `%${search}%`));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (page - 1) * limit;

  const [items, totalResult] = await Promise.all([
    db
      .select({
        id: restaurants.id,
        nom: restaurants.nom,
        slug: restaurants.slug,
        telephone: restaurants.telephone,
        ville: restaurants.ville,
        actif: restaurants.actif,
        suspendu: restaurants.suspendu,
        enLigne: restaurants.enLigne,
        nombreCommandes: restaurants.nombreCommandes,
        noteMoyenne: restaurants.noteMoyenne,
        createdAt: restaurants.createdAt,
        userId: restaurants.userId,
      })
      .from(restaurants)
      .where(whereClause)
      .orderBy(desc(restaurants.createdAt))
      .limit(limit)
      .offset(offset),

    db.select({ total: count() }).from(restaurants).where(whereClause),
  ]);

  return {
    items,
    total: Number(totalResult[0]?.total ?? 0),
    page,
    totalPages: Math.ceil(Number(totalResult[0]?.total ?? 0) / limit),
  };
}

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

  return { ...restaurant, proprietaire };
}

/** Compteurs pour les onglets de filtre */
export async function getRestaurantsCountsAdmin() {
  const result = await db
    .select({
      enAttente: sql<number>`COUNT(*) FILTER (WHERE ${restaurants.actif} = false AND ${restaurants.suspendu} = false)`,
      actifs: sql<number>`COUNT(*) FILTER (WHERE ${restaurants.actif} = true AND ${restaurants.suspendu} = false)`,
      suspendus: sql<number>`COUNT(*) FILTER (WHERE ${restaurants.suspendu} = true)`,
      total: count(),
    })
    .from(restaurants);

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
  statut?: StatutCommande;
  search?: string; // recherche par numéro ou nom client
  dateDebut?: Date;
  dateFin?: Date;
  page?: number;
  limit?: number;
}

export async function getCommandesGlobalAdmin({
  restaurantId,
  statut,
  search,
  dateDebut,
  dateFin,
  page = 1,
  limit = 25,
}: GetCommandesGlobalAdminOptions) {
  const conditions = [];

  if (restaurantId) conditions.push(eq(commandes.restaurantId, restaurantId));
  if (statut) conditions.push(eq(commandes.statut, statut));
  if (dateDebut) conditions.push(gte(commandes.createdAt, dateDebut));
  if (dateFin) conditions.push(lte(commandes.createdAt, dateFin));
  if (search) {
    conditions.push(
      or(
        like(commandes.numero, `%${search}%`),
        like(commandes.nomClient, `%${search}%`),
      ),
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (page - 1) * limit;

  const [items, totalResult] = await Promise.all([
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
      })
      .from(commandes)
      .where(whereClause)
      .orderBy(desc(commandes.createdAt))
      .limit(limit)
      .offset(offset),

    db.select({ total: count() }).from(commandes).where(whereClause),
  ]);

  // Joindre les noms de restaurant (une seule requête groupée)
  const restaurantIds = [...new Set(items.map((i) => i.restaurantId))];
  const restaurantsMap =
    restaurantIds.length > 0
      ? await db
          .select({ id: restaurants.id, nom: restaurants.nom })
          .from(restaurants)
          .where(inArray(restaurants.id, restaurantIds))
      : [];

  const nomParId = new Map(restaurantsMap.map((r) => [r.id, r.nom]));

  return {
    items: items.map((i) => ({
      ...i,
      restaurantNom: nomParId.get(i.restaurantId) ?? "Inconnu",
    })),
    total: Number(totalResult[0]?.total ?? 0),
    page,
    totalPages: Math.ceil(Number(totalResult[0]?.total ?? 0) / limit),
  };
}

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
  if (search) {
    conditions.push(
      or(like(users.nom, `%${search}%`), like(users.email, `%${search}%`)),
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (page - 1) * limit;

  const [items, totalResult] = await Promise.all([
    db
      .select({
        id: users.id,
        nom: users.nom,
        email: users.email,
        telephone: users.telephone,
        role: users.role,
        suspendu: users.suspendu,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset),

    db.select({ total: count() }).from(users).where(whereClause),
  ]);

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
  const conditions = search
    ? [
        or(
          like(clients.nom, `%${search}%`),
          like(clients.telephone, `%${search}%`),
        ),
      ]
    : [];

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (page - 1) * limit;

  const [items, totalResult] = await Promise.all([
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
  ]);

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

  const [
    restaurantsStats,
    usersTotal,
    clientsTotal,
    commandesAujourdhui,
    commandesMois,
    gmvMois,
    gmvMoisDernier,
    commissionsEnAttente,
  ] = await Promise.all([
    getRestaurantsCountsAdmin(),

    db
      .select({ count: count() })
      .from(users)
      .where(eq(users.role, "restaurateur")),

    db.select({ count: count() }).from(clients),

    db
      .select({ count: count() })
      .from(commandes)
      .where(gte(commandes.createdAt, debutAujourdhui)),

    db
      .select({ count: count() })
      .from(commandes)
      .where(gte(commandes.createdAt, debutMois)),

    db
      .select({ total: sql<number>`COALESCE(SUM(${commandes.total}), 0)` })
      .from(commandes)
      .where(
        and(
          gte(commandes.createdAt, debutMois),
          eq(commandes.statut, "servie"),
        ),
      ),

    db
      .select({ total: sql<number>`COALESCE(SUM(${commandes.total}), 0)` })
      .from(commandes)
      .where(
        and(
          gte(commandes.createdAt, debutMoisDernier),
          lte(commandes.createdAt, finMoisDernier),
          eq(commandes.statut, "servie"),
        ),
      ),

    db
      .select({
        total: sql<number>`COALESCE(SUM(${commissions.montantCommission}), 0)`,
      })
      .from(commissions)
      .where(eq(commissions.statut, "en_attente")),
  ]);

  const gmvMoisVal = Number(gmvMois[0]?.total ?? 0);
  const gmvMoisDernierVal = Number(gmvMoisDernier[0]?.total ?? 0);
  const croissanceGmv =
    gmvMoisDernierVal > 0
      ? Math.round(((gmvMoisVal - gmvMoisDernierVal) / gmvMoisDernierVal) * 100)
      : null;

  return {
    restaurants: {
      total: Number(restaurantsStats?.total ?? 0),
      actifs: Number(restaurantsStats?.actifs ?? 0),
      enAttente: Number(restaurantsStats?.enAttente ?? 0),
      suspendus: Number(restaurantsStats?.suspendus ?? 0),
    },
    usersTotal: Number(usersTotal[0]?.count ?? 0),
    clientsTotal: Number(clientsTotal[0]?.count ?? 0),
    commandesAujourdhui: Number(commandesAujourdhui[0]?.count ?? 0),
    commandesMois: Number(commandesMois[0]?.count ?? 0),
    gmvMois: gmvMoisVal,
    croissanceGmv,
    commissionsEnAttente: Number(commissionsEnAttente[0]?.total ?? 0),
  };
}

/** Évolution plateforme entière sur N jours (graphique dashboard admin) */
export async function getEvolutionPlateformeAdmin(jours = 30) {
  const dateDebut = new Date();
  dateDebut.setDate(dateDebut.getDate() - jours);

  return db
    .select({
      jour: sql<string>`DATE(${commandes.createdAt} AT TIME ZONE 'UTC')`,
      count: count(),
      gmv: sql<number>`COALESCE(SUM(${commandes.total}), 0)`,
    })
    .from(commandes)
    .where(gte(commandes.createdAt, dateDebut))
    .groupBy(sql`DATE(${commandes.createdAt} AT TIME ZONE 'UTC')`)
    .orderBy(sql`DATE(${commandes.createdAt} AT TIME ZONE 'UTC')`);
}

// ============================================================================
// COMMISSIONS
// ============================================================================

export interface GetCommissionsAdminOptions {
  restaurantId?: string;
  statut?: "en_attente" | "payee" | "annulee" | "tous";
  page?: number;
  limit?: number;
}

export async function getCommissionsAdmin({
  restaurantId,
  statut = "tous",
  page = 1,
  limit = 20,
}: GetCommissionsAdminOptions) {
  const conditions = [];
  if (restaurantId) conditions.push(eq(commissions.restaurantId, restaurantId));
  if (statut !== "tous") conditions.push(eq(commissions.statut, statut));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (page - 1) * limit;

  const [items, totalResult] = await Promise.all([
    db
      .select()
      .from(commissions)
      .where(whereClause)
      .orderBy(desc(commissions.createdAt))
      .limit(limit)
      .offset(offset),

    db.select({ total: count() }).from(commissions).where(whereClause),
  ]);

  return {
    items,
    total: Number(totalResult[0]?.total ?? 0),
    page,
    totalPages: Math.ceil(Number(totalResult[0]?.total ?? 0) / limit),
  };
}

/** Montant total dû par restaurant (regroupé) — pour la vue "qui doit quoi" */
export async function getCommissionsParRestaurantAdmin() {
  return db
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
    .orderBy(desc(sql`SUM(${commissions.montantCommission})`));
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

  return db
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
    .offset(offset);
}
