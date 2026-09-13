import { cache } from "react";
import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { batchRead, db } from "@/infrastructure/db";
import { withDatabaseReadRetry } from "@/infrastructure/db/read-retry";
import {
  commandes,
  financialTransactions,
  payments,
  restaurants,
} from "@/infrastructure/db/schema";
import type { AdminOrderSupportInput } from "../contracts";

export async function listAdminOrderSupportRecords(
  input: AdminOrderSupportInput,
) {
  const conditions = [];
  if (input.restaurantId) conditions.push(eq(commandes.restaurantId, input.restaurantId));
  if (input.restaurantSearch) {
    conditions.push(ilike(restaurants.nom, `%${input.restaurantSearch}%`));
  }
  if (input.statut) conditions.push(eq(commandes.statut, input.statut));
  if (input.startDate) conditions.push(gte(commandes.createdAt, input.startDate));
  if (input.endDate) conditions.push(lte(commandes.createdAt, input.endDate));
  if (input.search) {
    conditions.push(
      or(
        ilike(commandes.numero, `%${input.search}%`),
        ilike(commandes.nomClient, `%${input.search}%`),
      )!,
    );
  }

  if (input.signal === "stalled") {
    const stalledBefore = new Date();
    stalledBefore.setHours(stalledBefore.getHours() - 2);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    conditions.push(
      inArray(commandes.statut, ["recue", "en_preparation", "prete"]),
      lte(commandes.createdAt, stalledBefore),
      gte(commandes.createdAt, sevenDaysAgo),
    );
  } else if (input.signal === "payment_failed") {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    conditions.push(sql`EXISTS (
      SELECT 1 FROM ${payments}
      INNER JOIN ${financialTransactions}
        ON ${financialTransactions.id} = ${payments.transactionId}
      WHERE ${financialTransactions.restaurantOrderId} = ${commandes.id}
        AND ${payments.status} = ${"failed"}
        AND ${payments.createdAt} >= ${thirtyDaysAgo}
    )`);
  } else if (input.signal === "refunded") {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    conditions.push(sql`EXISTS (
      SELECT 1
      FROM transactions refund
      INNER JOIN payments original_payment ON original_payment.id = refund.original_payment_id
      INNER JOIN transactions original_transaction ON original_transaction.id = original_payment.transaction_id
      WHERE refund.type::text = 'remboursement'
        AND refund.status::text <> 'cancelled'
        AND original_transaction.restaurant_order_id = ${commandes.id}
        AND refund.created_at >= ${thirtyDaysAgo}
    )`);
  } else if (input.signal === "cancelled_today") {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    conditions.push(
      eq(commandes.statut, "annulee"),
      gte(commandes.createdAt, startOfToday),
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (input.page - 1) * input.limit;
  const [items, totalRows] = await withDatabaseReadRetry(() =>
    batchRead([
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
        .where(where)
        .orderBy(desc(commandes.createdAt))
        .limit(input.limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(commandes)
        .innerJoin(restaurants, eq(commandes.restaurantId, restaurants.id))
        .where(where),
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

export const getAdminOrderSupportSummaryRecord = cache(async () => {
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
          SELECT COUNT(*) FROM ${payments}
          WHERE ${payments.status} = ${"failed"}
            AND ${payments.createdAt} >= ${thirtyDaysAgo}
        )`,
        refundedPayments: sql<number>`(
          SELECT COUNT(*) FROM ${financialTransactions}
          WHERE ${financialTransactions.type} = ${"remboursement"}
            AND ${financialTransactions.status} <> ${"cancelled"}
            AND ${financialTransactions.createdAt} >= ${thirtyDaysAgo}
        )`,
        cancelledToday: sql<number>`(
          SELECT COUNT(*) FROM ${commandes}
          WHERE ${commandes.statut} = ${"annulee"}
            AND ${commandes.createdAt} >= ${startOfToday}
        )`,
      })
      .from(sql`(SELECT 1) AS admin_order_support_summary_source`),
  );
  return {
    stalledOrders: Number(summary?.stalledOrders ?? 0),
    failedPayments: Number(summary?.failedPayments ?? 0),
    refundedPayments: Number(summary?.refundedPayments ?? 0),
    cancelledToday: Number(summary?.cancelledToday ?? 0),
  };
});
