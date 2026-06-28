import { cacheKey, TTL, withCache } from "@/lib/cache";
import { getOffset, PAGINATION } from "@/lib/config/pagination";
import { and, asc, count, desc, eq, gte, like, lte, sql } from "drizzle-orm";
import { db } from "./index";
import { avis, commandes, notifications, plats } from "./schema";
import type { ModeCommande, StatutCommande } from "./types";

// ============================================================================
// USERS
// ============================================================================

export async function getUserById(id: string) {
  return db.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, id),
    with: { restaurant: true },
  });
}

export async function getUserByEmail(email: string) {
  return db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, email),
  });
}

// ============================================================================
// RESTAURANTS
// ============================================================================

/** Restaurant du gérant connecté — avec tout */
export async function getMyRestaurantFull(userId: string) {
  return db.query.restaurants.findFirst({
    where: (r, { eq }) => eq(r.userId, userId),
    with: {
      abonnement: true,
      creneaux: {
        orderBy: (c, { asc }) => [asc(c.nom)],
      },
      categories: {
        orderBy: (c, { asc }) => [asc(c.ordre)],
        with: {
          plats: {
            orderBy: (p, { asc }) => [asc(p.ordre)],
          },
        },
      },
      livreurs: {
        where: (l, { eq }) => eq(l.actif, true),
      },
    },
  });
}

/** Juste le restaurant (sans les sous-données) */
export async function getMyRestaurant(userId: string) {
  return withCache(cacheKey.restaurantByUser(userId), TTL.RESTAURANT, () =>
    db.query.restaurants.findFirst({
      where: (r, { eq }) => eq(r.userId, userId),
    }),
  );
}

export async function getRestaurantById(id: string) {
  return db.query.restaurants.findFirst({
    where: (r, { eq }) => eq(r.id, id),
    with: { abonnement: true },
  });
}

export async function getRestaurantBySlug(slug: string) {
  return withCache(cacheKey.restaurantPublic(slug), TTL.RESTAURANT_PUBLIC, () =>
    db.query.restaurants.findFirst({
      where: (r, { eq }) => eq(r.slug, slug),
    }),
  );
}

// ============================================================================
// CRENEAUX HORAIRES
// ============================================================================

export async function getCreneauxRestaurant(restaurantId: string) {
  return withCache(
    cacheKey.creneauxRestaurant(restaurantId),
    TTL.CATEGORIES,
    () =>
      db.query.creneauxHoraires.findMany({
        where: (c, { eq }) => eq(c.restaurantId, restaurantId),
        orderBy: (c, { asc }) => [asc(c.nom)],
      }),
  );
}

// ============================================================================
// CATEGORIES
// ============================================================================

export async function getCategoriesRestaurant(restaurantId: string) {
  return withCache(cacheKey.categories(restaurantId), TTL.CATEGORIES, () =>
    db.query.categories.findMany({
      where: (c, { eq }) => eq(c.restaurantId, restaurantId),
      orderBy: (c, { asc }) => [asc(c.ordre)],
      with: {
        creneau: true,
        plats: {
          orderBy: (p, { asc }) => [asc(p.ordre)],
        },
      },
    }),
  );
}

export async function getCategorieById(id: string, restaurantId: string) {
  return db.query.categories.findFirst({
    where: (c, { eq, and }) =>
      and(eq(c.id, id), eq(c.restaurantId, restaurantId)),
    with: { plats: true },
  });
}

// ============================================================================
// PLATS
// ============================================================================

export interface GetPlatsOptions {
  restaurantId: string;
  categorieId?: string;
  disponible?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export async function getPlats({
  restaurantId,
  categorieId,
  disponible,
  search,
  page = 1,
  limit = PAGINATION.PLATS_PAR_PAGE,
}: GetPlatsOptions) {
  const validLimit = Math.min(limit, PAGINATION.MAX_PAR_PAGE);
  const offset = getOffset(page, validLimit);

  const conditions = [eq(plats.restaurantId, restaurantId)];

  if (categorieId) conditions.push(eq(plats.categorieId, categorieId));
  if (disponible !== undefined)
    conditions.push(eq(plats.disponible, disponible));
  if (search) conditions.push(like(plats.nom, `%${search}%`));

  const [items, totalResult] = await Promise.all([
    withCache(
      cacheKey.plats(
        restaurantId,
        page,
        categorieId ?? null,
        disponible ?? null,
        search ?? "",
      ),
      TTL.PLATS,
      () =>
        db.query.plats.findMany({
          where: and(...conditions),
          orderBy: [asc(plats.ordre), asc(plats.nom)],
          offset,
          limit: validLimit,
          with: { categorie: true },
        }),
    ),
    db
      .select({ count: count() })
      .from(plats)
      .where(and(...conditions)),
  ]);

  return {
    items,
    total: totalResult[0].count,
    page,
    limit: validLimit,
    totalPages: Math.ceil(totalResult[0].count / validLimit),
  };
}

export async function getPlatById(id: string, restaurantId: string) {
  return db.query.plats.findFirst({
    where: (p, { eq, and }) =>
      and(eq(p.id, id), eq(p.restaurantId, restaurantId)),
    with: {
      categorie: true,
      creneau: true,
      promotions: {
        where: (pr, { eq }) => eq(pr.actif, true),
      },
    },
  });
}

export async function getSimilarPlats(
  platId: string,
  restaurantId: string,
  categorieId: string,
  limit = 4,
) {
  return db.query.plats.findMany({
    where: (p, { eq, and, ne }) =>
      and(
        eq(p.restaurantId, restaurantId),
        eq(p.categorieId, categorieId),
        ne(p.id, platId),
      ),
    orderBy: [desc(plats.nombreCommandes), asc(plats.nom)],
    limit,
    with: { categorie: true },
  });
}

// ============================================================================
// COMMANDES
// ============================================================================

export interface GetCommandesOptions {
  restaurantId: string;
  statut?: StatutCommande;
  modeCommande?: ModeCommande;
  dateDebut?: Date;
  dateFin?: Date;
  search?: string; // recherche sur numero ou nomClient
  page?: number;
  limit?: number;
}

export async function getCommandes({
  restaurantId,
  statut,
  modeCommande,
  dateDebut,
  dateFin,
  search,
  page = 1,
  limit = PAGINATION.COMMANDES_PAR_PAGE,
}: GetCommandesOptions) {
  const validLimit = Math.min(limit, PAGINATION.MAX_PAR_PAGE);
  const offset = getOffset(page, validLimit);

  const conditions = [eq(commandes.restaurantId, restaurantId)];

  if (statut) conditions.push(eq(commandes.statut, statut));
  if (modeCommande) conditions.push(eq(commandes.modeCommande, modeCommande));
  if (dateDebut) conditions.push(gte(commandes.createdAt, dateDebut));
  if (dateFin) conditions.push(lte(commandes.createdAt, dateFin));
  if (search) {
    const searchPattern = `%${search}%`;
    conditions.push(
      sql`${commandes.numero} LIKE ${searchPattern} OR ${commandes.nomClient} LIKE ${searchPattern}`,
    );
  }

  const [items, totalResult] = await Promise.all([
    withCache(
      cacheKey.commandes(
        restaurantId,
        page,
        statut,
        modeCommande,
        dateDebut?.toISOString(),
        dateFin?.toISOString(),
        search ?? "",
      ),
      TTL.COMMANDES,
      () =>
        db.query.commandes.findMany({
          where: and(...conditions),
          orderBy: [desc(commandes.createdAt)],
          offset,
          limit: validLimit,
          with: {
            paiement: true,
            livraison: { with: { livreur: true } },
          },
        }),
    ),
    db
      .select({ count: count() })
      .from(commandes)
      .where(and(...conditions)),
  ]);

  return {
    items,
    total: totalResult[0].count,
    page,
    limit: validLimit,
    totalPages: Math.ceil(totalResult[0].count / validLimit),
  };
}

export async function getCommandeById(id: string, restaurantId: string) {
  return db.query.commandes.findFirst({
    where: (c, { eq, and }) =>
      and(eq(c.id, id), eq(c.restaurantId, restaurantId)),
    with: {
      client: true,
      paiement: true,
      livraison: { with: { livreur: true } },
      avis: true,
    },
  });
}

export async function getCommandeByNumero(
  numero: string,
  restaurantId: string,
) {
  return db.query.commandes.findFirst({
    where: (c, { eq, and }) =>
      and(eq(c.numero, numero), eq(c.restaurantId, restaurantId)),
    with: { client: true, paiement: true },
  });
}

/** Compteurs par statut pour les onglets dashboard */
export async function getCommandesCountByStatut(restaurantId: string) {
  const result = await db
    .select({
      statut: commandes.statut,
      count: count(),
    })
    .from(commandes)
    .where(eq(commandes.restaurantId, restaurantId))
    .groupBy(commandes.statut);

  return result;
}

// ============================================================================
// CLIENTS
// ============================================================================

export async function getClients(restaurantId: string, page = 1, limit = 20) {
  // Clients qui ont commandé dans ce restaurant
  const result = await db
    .selectDistinctOn([commandes.clientId], {
      clientId: commandes.clientId,
      nomClient: commandes.nomClient,
      telephoneClient: commandes.telephoneClient,
      nombreCommandes: count(commandes.id),
    })
    .from(commandes)
    .where(
      and(
        eq(commandes.restaurantId, restaurantId),
        sql`${commandes.clientId} IS NOT NULL`,
      ),
    )
    .groupBy(commandes.clientId, commandes.nomClient, commandes.telephoneClient)
    .orderBy(desc(count(commandes.id)))
    .offset((page - 1) * limit)
    .limit(limit);

  return result;
}

export async function getClientById(id: string) {
  return db.query.clients.findFirst({
    where: (c, { eq }) => eq(c.id, id),
  });
}

// ============================================================================
// LIVREURS
// ============================================================================

export async function getLivreurs(restaurantId: string) {
  return db.query.livreurs.findMany({
    where: (l, { eq, and }) =>
      and(eq(l.restaurantId, restaurantId), eq(l.actif, true)),
    orderBy: (l, { asc }) => [asc(l.nom)],
  });
}

export async function getLivreurById(id: string, restaurantId: string) {
  return db.query.livreurs.findFirst({
    where: (l, { eq, and }) =>
      and(eq(l.id, id), eq(l.restaurantId, restaurantId)),
    with: {
      livraisons: {
        orderBy: (li, { desc }) => [desc(li.createdAt)],
        limit: 10,
      },
    },
  });
}

// ============================================================================
// PROMOTIONS
// ============================================================================

export async function getPromotionsActives(restaurantId: string) {
  const now = new Date();
  return db.query.promotions.findMany({
    where: (p, { eq, and, or, isNull, lte, gte }) =>
      and(
        eq(p.restaurantId, restaurantId),
        eq(p.actif, true),
        lte(p.dateDebut, now),
        or(isNull(p.dateFin), gte(p.dateFin, now)),
      ),
    with: { plat: true, categorie: true },
  });
}

// ============================================================================
// AVIS
// ============================================================================

export async function getAvisRestaurant(
  restaurantId: string,
  page = 1,
  limit = 10,
) {
  const [items, totalResult] = await Promise.all([
    db.query.avis.findMany({
      where: (a, { eq, and }) =>
        and(eq(a.restaurantId, restaurantId), eq(a.visible, true)),
      orderBy: (a, { desc }) => [desc(a.createdAt)],
      offset: (page - 1) * limit,
      limit,
      with: { client: true, commande: true },
    }),
    db
      .select({ count: count() })
      .from(avis)
      .where(and(eq(avis.restaurantId, restaurantId), eq(avis.visible, true))),
  ]);

  return {
    items,
    total: totalResult[0].count,
    page,
    totalPages: Math.ceil(totalResult[0].count / limit),
  };
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export async function getNotificationsUser(userId: string, limit = 20) {
  return db.query.notifications.findMany({
    where: (n, { eq }) => eq(n.userId, userId),
    orderBy: (n, { desc }) => [desc(n.createdAt)],
    limit,
  });
}

export async function countNotificationsNonLues(userId: string) {
  const result = await db
    .select({ count: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.lue, false)));

  return result[0].count;
}

// ============================================================================
// STATISTIQUES DASHBOARD
// ============================================================================

export async function getStatsDashboard(restaurantId: string) {
  return withCache(cacheKey.stats(restaurantId), TTL.STATS, async () => {
    const maintenant = new Date();
    const debutJour = new Date(maintenant);
    debutJour.setHours(0, 0, 0, 0);
    const debutSemaine = new Date(maintenant);
    debutSemaine.setDate(maintenant.getDate() - 7);
    const debutMois = new Date(
      maintenant.getFullYear(),
      maintenant.getMonth(),
      1,
    );

    const [
      commandesAujourdhui,
      commandesSemaine,
      commandesMois,
      chiffreAffairesMois,
      commandesEnCours,
    ] = await Promise.all([
      // Commandes aujourd'hui
      db
        .select({ count: count() })
        .from(commandes)
        .where(
          and(
            eq(commandes.restaurantId, restaurantId),
            gte(commandes.createdAt, debutJour),
          ),
        ),
      // Commandes 7 derniers jours
      db
        .select({ count: count() })
        .from(commandes)
        .where(
          and(
            eq(commandes.restaurantId, restaurantId),
            gte(commandes.createdAt, debutSemaine),
          ),
        ),
      // Commandes ce mois
      db
        .select({ count: count() })
        .from(commandes)
        .where(
          and(
            eq(commandes.restaurantId, restaurantId),
            gte(commandes.createdAt, debutMois),
          ),
        ),
      // CA ce mois (en centimes)
      db
        .select({ total: sql<number>`COALESCE(SUM(${commandes.total}), 0)` })
        .from(commandes)
        .where(
          and(
            eq(commandes.restaurantId, restaurantId),
            gte(commandes.createdAt, debutMois),
            eq(commandes.statut, "servie"),
          ),
        ),
      // Commandes en cours (reçues + en préparation + prêtes)
      db
        .select({ statut: commandes.statut, count: count() })
        .from(commandes)
        .where(
          and(
            eq(commandes.restaurantId, restaurantId),
            sql`${commandes.statut} IN ('recue', 'en_preparation', 'prete')`,
          ),
        )
        .groupBy(commandes.statut),
    ]);

    return {
      commandesAujourdhui: commandesAujourdhui[0].count,
      commandesSemaine: commandesSemaine[0].count,
      commandesMois: commandesMois[0].count,
      chiffreAffairesMois: chiffreAffairesMois[0].total,
      commandesEnCours,
    };
  });
}

/** Évolution des commandes par jour sur les N derniers jours */
export async function getCommandesParJour(restaurantId: string, jours = 7) {
  const dateDebut = new Date();
  dateDebut.setDate(dateDebut.getDate() - jours);

  const result = await db
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

  return result;
}

/** Top plats les plus commandés */
export async function getTopPlats(restaurantId: string, limit = 5) {
  return withCache(cacheKey.topPlats(restaurantId, limit), TTL.PLATS, () =>
    db.query.plats.findMany({
      where: (p, { eq }) => eq(p.restaurantId, restaurantId),
      orderBy: (p, { desc }) => [desc(p.nombreCommandes)],
      limit,
      with: { categorie: true },
    }),
  );
}
