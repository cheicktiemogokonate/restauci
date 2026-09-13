import "server-only";

import { count, eq, gte, sql } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/infrastructure/db";
import {
  clients,
  commandes,
  commissions,
  restaurants,
  subscriptionPeriods,
  subscriptionRequests,
  users,
} from "@/infrastructure/db/schema";
import { withDatabaseReadRetry } from "@/infrastructure/db/read-retry";
import type {
  AdminActionCenterDTO,
  AdminActivityPointDTO,
  AdminPlatformStatsDTO,
} from "../model";

export async function getAdminPlatformStatsRecord(): Promise<AdminPlatformStatsDTO> {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(startOfMonth.getTime() - 1);

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
          SELECT COUNT(*) FROM ${restaurants} WHERE ${restaurants.suspendu} = true
        )`,
        usersTotal: sql<number>`(
          SELECT COUNT(*) FROM ${users} WHERE ${users.role} = ${"partner"}
        )`,
        clientsTotal: sql<number>`(SELECT COUNT(*) FROM ${clients})`,
        commandesAujourdhui: sql<number>`(
          SELECT COUNT(*) FROM ${commandes}
          WHERE ${commandes.createdAt} >= ${startOfToday}
        )`,
        commandesMois: sql<number>`(
          SELECT COUNT(*) FROM ${commandes}
          WHERE ${commandes.createdAt} >= ${startOfMonth}
        )`,
        gmvMois: sql<number>`(
          SELECT COALESCE(SUM(${commandes.total}), 0) FROM ${commandes}
          WHERE ${commandes.createdAt} >= ${startOfMonth}
            AND ${commandes.statut}::text = ${"servie"}
        )`,
        gmvMoisDernier: sql<number>`(
          SELECT COALESCE(SUM(${commandes.total}), 0) FROM ${commandes}
          WHERE ${commandes.createdAt} >= ${startOfLastMonth}
            AND ${commandes.createdAt} <= ${endOfLastMonth}
            AND ${commandes.statut}::text = ${"servie"}
        )`,
        commissionsEnAttente: sql<number>`(
          SELECT COALESCE(SUM(${commissions.amountFcfa} - COALESCE((
            SELECT SUM(allocation.amount_fcfa)
            FROM commission_settlement_allocations allocation
            INNER JOIN commission_settlements settlement
              ON settlement.id = allocation.settlement_id
            WHERE allocation.commission_id = commissions.id
              AND settlement.statut = 'confirmed'
          ), 0)), 0)
          FROM ${commissions}
          WHERE ${commissions.commercialStatus} = ${"due"}
            AND ${commissions.collectionMode} = ${"cash_receivable"}
        )`,
      })
      .from(sql`(SELECT 1) AS admin_stats_source`),
  );

  const gmvMois = Number(stats?.gmvMois ?? 0);
  const gmvMoisDernier = Number(stats?.gmvMoisDernier ?? 0);
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
    gmvMois,
    croissanceGmv:
      gmvMoisDernier > 0
        ? Math.round(((gmvMois - gmvMoisDernier) / gmvMoisDernier) * 100)
        : null,
    commissionsEnAttente: Number(stats?.commissionsEnAttente ?? 0),
  };
}

export const getAdminActionCenterRecord = cache(
  async (): Promise<AdminActionCenterDTO> => {
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
            SELECT COUNT(DISTINCT ${commissions.partnerAccountId})
            FROM ${commissions}
            WHERE ${commissions.commercialStatus} = ${"due"}
              AND ${commissions.collectionMode} = ${"cash_receivable"}
          )`,
          commissionsAmount: sql<number>`(
            SELECT COALESCE(SUM(${commissions.amountFcfa} - COALESCE((
              SELECT SUM(allocation.amount_fcfa)
              FROM commission_settlement_allocations allocation
              INNER JOIN commission_settlements settlement
                ON settlement.id = allocation.settlement_id
              WHERE allocation.commission_id = commissions.id
                AND settlement.statut = 'confirmed'
            ), 0)), 0)
            FROM ${commissions}
            WHERE ${commissions.commercialStatus} = ${"due"}
              AND ${commissions.collectionMode} = ${"cash_receivable"}
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
  },
);

export async function getAdminActivityRecord(
  days: number,
): Promise<AdminActivityPointDTO[]> {
  const from = new Date();
  from.setDate(from.getDate() - days);
  const rows = await withDatabaseReadRetry(() =>
    db
      .select({
        jour: sql<string>`DATE(${commandes.createdAt} AT TIME ZONE 'UTC')`,
        count: count(),
        gmv: sql<number>`COALESCE(SUM(${commandes.total}), 0)`,
      })
      .from(commandes)
      .where(gte(commandes.createdAt, from))
      .groupBy(sql`DATE(${commandes.createdAt} AT TIME ZONE 'UTC')`)
      .orderBy(sql`DATE(${commandes.createdAt} AT TIME ZONE 'UTC')`),
  );
  return rows.map((row) => ({
    jour: row.jour,
    count: Number(row.count),
    gmv: Number(row.gmv),
  }));
}

export const getPendingSubscriptionRequestsCountRecord = cache(async () => {
  const [result] = await withDatabaseReadRetry(() =>
    db
      .select({ total: count() })
      .from(subscriptionRequests)
      .where(eq(subscriptionRequests.statut, "en_attente")),
  );
  return Number(result?.total ?? 0);
});
