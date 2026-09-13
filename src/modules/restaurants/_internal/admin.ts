import "server-only";

import {
  and,
  count,
  desc,
  eq,
  ilike,
  isNotNull,
  isNull,
  sql,
} from "drizzle-orm";
import { getPartnerAccountById } from "@/modules/partners/server";
import { getServiceMarketCapability } from "@/modules/service-markets/server";
import { invalidateCache, cacheKey, invalidateRestaurantCache } from "@/infrastructure/cache";
import { env } from "@/infrastructure/env";
import { batchRead, db } from "@/infrastructure/db";
import { withDatabaseReadRetry } from "@/infrastructure/db/read-retry";
import { escapeLikePattern } from "@/infrastructure/db/like";
import { restaurants, partnerAccounts, users } from "@/infrastructure/db/schema";
import { transactionalDb } from "@/infrastructure/db";
import { sendNotification } from "@/modules/notifications/server";
import { persistBusinessEvent } from "@/modules/events/server";
import { randomUUID } from "node:crypto";
import type { z } from "zod";
import type { adminRestaurantListSchema } from "../contracts";
import { RestaurantAdminTransitionError } from "../model";

type AdminRestaurantList = z.output<typeof adminRestaurantListSchema>;

export async function listAdminRestaurantRecords(input: AdminRestaurantList) {
  const conditions = [];

  if (input.statut === "en_attente") {
    conditions.push(eq(restaurants.actif, false));
    conditions.push(eq(restaurants.suspendu, false));
    conditions.push(isNull(restaurants.motifRejet));
  } else if (input.statut === "actif") {
    conditions.push(eq(restaurants.actif, true));
    conditions.push(eq(restaurants.suspendu, false));
  } else if (input.statut === "suspendu") {
    conditions.push(eq(restaurants.suspendu, true));
  } else if (input.statut === "rejete") {
    conditions.push(eq(restaurants.actif, false));
    conditions.push(eq(restaurants.suspendu, false));
    conditions.push(isNotNull(restaurants.motifRejet));
  }

  if (input.search) {
    conditions.push(
      ilike(restaurants.nom, `%${escapeLikePattern(input.search)}%`),
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (input.page - 1) * input.limit;
  const [items, totalRows] = await withDatabaseReadRetry(() =>
    batchRead([
      db
        .select({
          id: restaurants.id,
          partnerAccountId: restaurants.partnerAccountId,
          nom: restaurants.nom,
          slug: restaurants.slug,
          telephone: restaurants.telephone,
          ville: restaurants.ville,
          actif: restaurants.actif,
          suspendu: restaurants.suspendu,
          motifRejet: restaurants.motifRejet,
          enLigne: restaurants.enLigne,
          nombreCommandes: sql<number>`COALESCE((
            SELECT projection.completed_order_count
            FROM restaurant_order_projections projection
            WHERE projection.restaurant_id = ${restaurants.id}
          ), 0)::integer`,
          noteMoyenne: restaurants.noteMoyenne,
          createdAt: restaurants.createdAt,
        })
        .from(restaurants)
        .where(where)
        .orderBy(desc(restaurants.createdAt), desc(restaurants.id))
        .limit(input.limit)
        .offset(offset),
      db.select({ total: count() }).from(restaurants).where(where),
    ]),
  );
  const total = Number(totalRows[0]?.total ?? 0);
  return {
    items,
    total,
    page: input.page,
    totalPages: Math.ceil(total / input.limit),
  };
}

export async function getAdminRestaurantCountsRecord() {
  const [row] = await withDatabaseReadRetry(() =>
    db
      .select({
        enAttente: sql<number>`COUNT(*) FILTER (
          WHERE ${restaurants.actif} = false
            AND ${restaurants.suspendu} = false
            AND ${restaurants.motifRejet} IS NULL
        )`,
        actifs: sql<number>`COUNT(*) FILTER (
          WHERE ${restaurants.actif} = true AND ${restaurants.suspendu} = false
        )`,
        suspendus: sql<number>`COUNT(*) FILTER (
          WHERE ${restaurants.suspendu} = true
        )`,
        rejetes: sql<number>`COUNT(*) FILTER (
          WHERE ${restaurants.actif} = false
            AND ${restaurants.suspendu} = false
            AND ${restaurants.motifRejet} IS NOT NULL
        )`,
        total: count(),
      })
      .from(restaurants),
  );
  return row;
}

export async function getAdminRestaurantDetailRecord(restaurantId: string) {
  const [row] = await db
    .select({
      id: restaurants.id,
      partnerAccountId: restaurants.partnerAccountId,
      nom: restaurants.nom,
      adresse: restaurants.adresse,
      telephone: restaurants.telephone,
      actif: restaurants.actif,
      suspendu: restaurants.suspendu,
      motifRejet: restaurants.motifRejet,
      motifSuspension: restaurants.motifSuspension,
      nombreCommandes: sql<number>`COALESCE((
        SELECT projection.completed_order_count
        FROM restaurant_order_projections projection
        WHERE projection.restaurant_id = ${restaurants.id}
      ), 0)::integer`,
      noteMoyenne: restaurants.noteMoyenne,
      createdAt: restaurants.createdAt,
      ownerName: users.nom,
      ownerEmail: users.email,
      ownerPhone: users.telephone,
    })
    .from(restaurants)
    .innerJoin(
      partnerAccounts,
      eq(partnerAccounts.id, restaurants.partnerAccountId),
    )
    .innerJoin(users, eq(users.id, partnerAccounts.userId))
    .where(eq(restaurants.id, restaurantId))
    .limit(1);
  return row ?? null;
}

async function invalidateAdminRestaurantRecord(restaurant: {
  id: string;
  slug: string;
  partnerAccountId: string;
}) {
  const account = await getPartnerAccountById(restaurant.partnerAccountId);
  if (!account) throw new Error("Compte partenaire introuvable");
  await invalidateCache(
    cacheKey.restaurant(restaurant.id),
    cacheKey.restaurantByUser(account.userId),
  );
  await invalidateRestaurantCache(restaurant.id, restaurant.slug);
  return account.userId;
}

export async function validateAdminRestaurantRecord(
  restaurantId: string,
  adminId: string,
) {
  const eventId = randomUUID();
  const correlationId = randomUUID();
  const result = await transactionalDb.transaction(async (tx) => {
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
        throw new RestaurantAdminTransitionError(
          "Le restaurant doit être affecté sans ambiguïté à un marché avant sa validation.",
        );
      }
      const capability = await getServiceMarketCapability(
        candidate.serviceMarketId,
        "restaurant",
        tx,
      );
      if (capability?.status !== "active") {
        throw new RestaurantAdminTransitionError(
          "L'activité Restaurants n'est pas active dans le marché affecté.",
        );
      }
    }

    const [updated] = await tx
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
    if (!updated) {
      throw new RestaurantAdminTransitionError(
        "Seul un restaurant en attente peut être validé.",
      );
    }
    const account = await tx.query.partnerAccounts.findFirst({
      where: eq(partnerAccounts.id, updated.partnerAccountId),
      columns: { userId: true },
    });
    if (!account) throw new Error("Compte partenaire introuvable");
    await persistBusinessEvent(tx, {
      eventId,
      correlationId,
      type: "restaurant.moderation.validated.v1",
      actor: { type: "admin", id: adminId },
      partnerAccountId: updated.partnerAccountId,
      target: { type: "restaurant", id: restaurantId },
      occurredAt: new Date(),
      payload: { decision: "validated" },
      effects: [
        {
          type: "audit.project",
          payload: { action: "restaurant_valide" },
        },
        {
          type: "notification.project",
          payload: {
            items: [
              {
                recipient: { type: "user", id: account.userId },
                template: "restaurant_validated",
                destination: { type: "restaurant", id: restaurantId },
              },
            ],
          },
        },
      ],
    });
    return { restaurant: updated, ownerUserId: account.userId };
  });

  const { restaurant, ownerUserId } = result;
  await invalidateAdminRestaurantRecord(restaurant);
  await sendNotification({
    userId: ownerUserId,
    restaurantId: restaurant.id,
    type: "restaurant_valide",
    titre: "Votre restaurant est validé",
    message: `Bonne nouvelle ! ${restaurant.nom} a été validé. Vous pouvez maintenant finaliser votre configuration et commencer votre activité.`,
    lienType: "restaurant",
    lienId: restaurant.id,
    data: { statut: "valide" },
    eventId,
    correlationId,
  });
  return restaurant;
}

export async function rejectAdminRestaurantRecord(
  restaurantId: string,
  adminId: string,
  reason: string,
) {
  const eventId = randomUUID();
  const correlationId = randomUUID();
  const result = await transactionalDb.transaction(async (tx) => {
    const [updated] = await tx
      .update(restaurants)
      .set({ actif: false, motifRejet: reason, updatedAt: new Date() })
      .where(
        and(
          eq(restaurants.id, restaurantId),
          eq(restaurants.actif, false),
          eq(restaurants.suspendu, false),
          isNull(restaurants.motifRejet),
        ),
      )
      .returning();
    if (!updated) {
      throw new RestaurantAdminTransitionError(
        "Seul un restaurant en attente peut être rejeté.",
      );
    }
    const account = await tx.query.partnerAccounts.findFirst({
      where: eq(partnerAccounts.id, updated.partnerAccountId),
      columns: { userId: true },
    });
    if (!account) throw new Error("Compte partenaire introuvable");
    await persistBusinessEvent(tx, {
      eventId,
      correlationId,
      type: "restaurant.moderation.rejected.v1",
      actor: { type: "admin", id: adminId },
      partnerAccountId: updated.partnerAccountId,
      target: { type: "restaurant", id: restaurantId },
      occurredAt: new Date(),
      payload: { decision: "rejected" },
      effects: [
        {
          type: "audit.project",
          payload: { action: "restaurant_rejete" },
        },
        {
          type: "notification.project",
          payload: {
            items: [
              {
                recipient: { type: "user", id: account.userId },
                template: "restaurant_rejected",
                destination: { type: "profil", id: restaurantId },
              },
            ],
          },
        },
      ],
    });
    return { restaurant: updated, ownerUserId: account.userId };
  });

  const { restaurant, ownerUserId } = result;
  await invalidateAdminRestaurantRecord(restaurant);
  await sendNotification({
    userId: ownerUserId,
    restaurantId: restaurant.id,
    type: "restaurant_rejete",
    titre: "Votre dossier nécessite des corrections",
    message: `Votre demande pour ${restaurant.nom} a été refusée. Motif : ${reason}`,
    lienType: "profil",
    lienId: restaurant.id,
    data: { statut: "rejete", motif: reason },
    eventId,
    correlationId,
  });
  return restaurant;
}

export async function suspendAdminRestaurantRecord(
  restaurantId: string,
  adminId: string,
  reason: string,
) {
  const occurredAt = new Date();
  const restaurant = await transactionalDb.transaction(async (tx) => {
    const [updated] = await tx
      .update(restaurants)
      .set({
        suspendu: true,
        motifSuspension: reason,
        enLigne: false,
        accepteCommandes: false,
        updatedAt: occurredAt,
      })
      .where(
        and(
          eq(restaurants.id, restaurantId),
          eq(restaurants.actif, true),
          eq(restaurants.suspendu, false),
        ),
      )
      .returning();
    if (!updated) {
      throw new RestaurantAdminTransitionError(
        "Seul un restaurant actif peut être suspendu.",
      );
    }
    await persistBusinessEvent(tx, {
      eventId: randomUUID(),
      correlationId: randomUUID(),
      type: "restaurant.moderation.suspended.v1",
      actor: { type: "admin", id: adminId },
      partnerAccountId: updated.partnerAccountId,
      target: { type: "restaurant", id: restaurantId },
      occurredAt,
      payload: { decision: "suspended" },
      effects: [
        {
          type: "audit.project",
          payload: { action: "restaurant_suspendu" },
        },
      ],
    });
    return updated;
  });
  await invalidateAdminRestaurantRecord(restaurant);
  return restaurant;
}

export async function reactivateAdminRestaurantRecord(
  restaurantId: string,
  adminId: string,
) {
  const occurredAt = new Date();
  const restaurant = await transactionalDb.transaction(async (tx) => {
    const [updated] = await tx
      .update(restaurants)
      .set({
        suspendu: false,
        motifSuspension: null,
        updatedAt: occurredAt,
      })
      .where(
        and(
          eq(restaurants.id, restaurantId),
          eq(restaurants.actif, true),
          eq(restaurants.suspendu, true),
        ),
      )
      .returning();
    if (!updated) {
      throw new RestaurantAdminTransitionError(
        "Seul un restaurant suspendu peut être réactivé.",
      );
    }
    await persistBusinessEvent(tx, {
      eventId: randomUUID(),
      correlationId: randomUUID(),
      type: "restaurant.moderation.reactivated.v1",
      actor: { type: "admin", id: adminId },
      partnerAccountId: updated.partnerAccountId,
      target: { type: "restaurant", id: restaurantId },
      occurredAt,
      payload: { decision: "reactivated" },
      effects: [
        {
          type: "audit.project",
          payload: { action: "restaurant_reactive" },
        },
      ],
    });
    return updated;
  });
  await invalidateAdminRestaurantRecord(restaurant);
  return restaurant;
}
