import { and, count, eq, gte, sql } from "drizzle-orm";
import { batchRead, db } from "@/infrastructure/db";
import { commandes } from "@/infrastructure/db/schema";
import { withDatabaseReadRetry } from "@/infrastructure/db/read-retry";
import { cacheKey, TTL, withCache } from "@/infrastructure/cache";
import type { RestaurantOrderMode } from "@/modules/orders/model";

export async function getRestaurantDashboardStatsRecord(restaurantId: string) {
  return withCache(cacheKey.stats(restaurantId), TTL.STATS, async () => {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [today, week, month, revenue, active] = await withDatabaseReadRetry(
      () =>
        batchRead([
          db.select({ count: count() }).from(commandes).where(and(
            eq(commandes.restaurantId, restaurantId),
            gte(commandes.createdAt, startOfDay),
          )),
          db.select({ count: count() }).from(commandes).where(and(
            eq(commandes.restaurantId, restaurantId),
            gte(commandes.createdAt, startOfWeek),
          )),
          db.select({ count: count() }).from(commandes).where(and(
            eq(commandes.restaurantId, restaurantId),
            gte(commandes.createdAt, startOfMonth),
          )),
          db.select({ total: sql<number>`COALESCE(SUM(${commandes.total}), 0)` })
            .from(commandes)
            .where(and(
              eq(commandes.restaurantId, restaurantId),
              gte(commandes.createdAt, startOfMonth),
              eq(commandes.statut, "servie"),
            )),
          db.select({ statut: commandes.statut, count: count() })
            .from(commandes)
            .where(and(
              eq(commandes.restaurantId, restaurantId),
              sql`${commandes.statut} IN ('recue', 'en_preparation', 'prete')`,
            ))
            .groupBy(commandes.statut),
        ]),
    );

    return {
      commandesAujourdhui: today[0].count,
      commandesSemaine: week[0].count,
      commandesMois: month[0].count,
      chiffreAffairesMois: Number(revenue[0].total),
      commandesEnCours: active,
    };
  });
}

export async function getRestaurantOrdersByModeRecord(restaurantId: string) {
  return withCache(cacheKey.dashboardModes(restaurantId), TTL.DASHBOARD, async () => {
    const rows = await db
      .select({ modeCommande: commandes.modeCommande, count: count() })
      .from(commandes)
      .where(eq(commandes.restaurantId, restaurantId))
      .groupBy(commandes.modeCommande);
    return rows.map((row) => ({
      modeCommande: row.modeCommande as RestaurantOrderMode,
      count: Number(row.count),
    }));
  });
}

export async function getRestaurantOrdersByDayRecord(
  restaurantId: string,
  days = 7,
) {
  return withCache(cacheKey.dashboardDaily(restaurantId, days), TTL.DASHBOARD, async () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    return db
      .select({
        jour: sql<string>`DATE(${commandes.createdAt} AT TIME ZONE 'UTC')`,
        count: count(),
        total: sql<number>`COALESCE(SUM(${commandes.total}), 0)`,
      })
      .from(commandes)
      .where(and(
        eq(commandes.restaurantId, restaurantId),
        gte(commandes.createdAt, startDate),
      ))
      .groupBy(sql`DATE(${commandes.createdAt} AT TIME ZONE 'UTC')`)
      .orderBy(sql`DATE(${commandes.createdAt} AT TIME ZONE 'UTC')`);
  });
}
