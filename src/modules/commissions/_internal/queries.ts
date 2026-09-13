import { and, count, desc, eq, gte, ilike, lte, sql } from "drizzle-orm";
import { batchRead, db } from "@/infrastructure/db";
import { withDatabaseReadRetry } from "@/infrastructure/db/read-retry";
import {
  commissions,
  commissionPolicySettings,
  commissionSettlements,
  restaurants,
} from "@/infrastructure/db/schema";
import type {
  AdminCommissionListInput,
  PartnerCommissionWorkspaceInput,
} from "../contracts";

export async function getCommissionPolicyRecord() {
  const policy = await withDatabaseReadRetry(() =>
    db.query.commissionPolicySettings.findFirst({
      where: eq(commissionPolicySettings.id, 1),
    }),
  );
  if (!policy) throw new Error("Politique de commissions absente");
  return policy;
}

export async function listAdminCommissionRecords(
  input: AdminCommissionListInput,
) {
  const conditions = [];
  if (input.restaurantId) conditions.push(eq(restaurants.id, input.restaurantId));
  if (input.status !== "all") {
    conditions.push(eq(commissions.commercialStatus, input.status));
  }
  if (input.startDate) conditions.push(gte(commissions.createdAt, input.startDate));
  if (input.endDate) conditions.push(lte(commissions.createdAt, input.endDate));
  if (input.restaurantSearch) {
    conditions.push(ilike(restaurants.nom, `%${input.restaurantSearch}%`));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (input.page - 1) * input.limit;

  const [items, totalRows, summaryRows] = await withDatabaseReadRetry(() =>
    batchRead([
      db
        .select({
          id: commissions.id,
          commandeId: commissions.commandeId,
          restaurantId: restaurants.id,
          partnerAccountId: commissions.partnerAccountId,
          montantCommande: commissions.baseAmountFcfa,
          tauxCommissionBps: commissions.rateBpsSnapshot,
          montantCommission: commissions.amountFcfa,
          statut: commissions.commercialStatus,
          collectionMode: commissions.collectionMode,
          dueAt: commissions.dueAt,
          createdAt: commissions.createdAt,
          restaurantNom: restaurants.nom,
        })
        .from(commissions)
        .innerJoin(
          restaurants,
          eq(commissions.partnerAccountId, restaurants.partnerAccountId),
        )
        .where(whereClause)
        .orderBy(desc(commissions.createdAt))
        .limit(input.limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(commissions)
        .innerJoin(
          restaurants,
          eq(commissions.partnerAccountId, restaurants.partnerAccountId),
        )
        .where(whereClause),
      db
        .select({
          montantTotal: sql<number>`COALESCE(SUM(${commissions.amountFcfa}), 0)`,
          restaurantsTotal: sql<number>`COUNT(DISTINCT ${commissions.partnerAccountId})`,
        })
        .from(commissions)
        .innerJoin(
          restaurants,
          eq(commissions.partnerAccountId, restaurants.partnerAccountId),
        )
        .where(whereClause),
    ]),
  );

  const total = Number(totalRows[0]?.total ?? 0);
  return {
    items,
    total,
    page: input.page,
    totalPages: Math.ceil(total / input.limit),
    summary: {
      montantTotal: Number(summaryRows[0]?.montantTotal ?? 0),
      restaurantsTotal: Number(summaryRows[0]?.restaurantsTotal ?? 0),
      commandesTotal: total,
    },
  };
}

export function listAdminRestaurantCommissionDebtRecords() {
  return withDatabaseReadRetry(() =>
    db
      .select({
        restaurantId: restaurants.id,
        partnerAccountId: commissions.partnerAccountId,
        restaurantNom: restaurants.nom,
        montantDu: sql<number>`COALESCE(SUM(${commissions.amountFcfa} - COALESCE((
          SELECT SUM(allocation.amount_fcfa)
          FROM commission_settlement_allocations allocation
          INNER JOIN commission_settlements settlement ON settlement.id = allocation.settlement_id
          WHERE allocation.commission_id = commissions.id
            AND settlement.statut = 'confirmed'
        ), 0)), 0)`,
        nombreCommandes: count(),
      })
      .from(commissions)
      .innerJoin(
        restaurants,
        eq(commissions.partnerAccountId, restaurants.partnerAccountId),
      )
      .where(
        and(
          eq(commissions.commercialStatus, "due"),
          eq(commissions.collectionMode, "cash_receivable"),
        ),
      )
      .groupBy(restaurants.id, commissions.partnerAccountId, restaurants.nom)
      .having(sql`SUM(${commissions.amountFcfa} - COALESCE((
        SELECT SUM(allocation.amount_fcfa)
        FROM commission_settlement_allocations allocation
        INNER JOIN commission_settlements settlement ON settlement.id = allocation.settlement_id
        WHERE allocation.commission_id = commissions.id
          AND settlement.statut = 'confirmed'
      ), 0)) > 0`)
      .orderBy(desc(sql`SUM(${commissions.amountFcfa})`)),
  );
}

export async function getPartnerCommissionWorkspaceRecord(
  input: PartnerCommissionWorkspaceInput,
) {
  const [commissionLines, settlements] = await withDatabaseReadRetry(() =>
    batchRead([
      db
        .select({
          id: commissions.id,
          commandeId: commissions.commandeId,
          amountFcfa: commissions.amountFcfa,
          commercialStatus: commissions.commercialStatus,
          collectionMode: commissions.collectionMode,
          dueAt: commissions.dueAt,
          createdAt: commissions.createdAt,
          allocatedFcfa: sql<number>`COALESCE((
            SELECT SUM(allocation.amount_fcfa)
            FROM commission_settlement_allocations allocation
            INNER JOIN commission_settlements settlement ON settlement.id = allocation.settlement_id
            WHERE allocation.commission_id = commissions.id
              AND settlement.statut = 'confirmed'
          ), 0)`,
        })
        .from(commissions)
        .where(eq(commissions.partnerAccountId, input.partnerAccountId))
        .orderBy(desc(commissions.createdAt))
        .limit(input.commissionLimit),
      db.query.commissionSettlements.findMany({
        where: and(
          eq(commissionSettlements.partnerAccountId, input.partnerAccountId),
          eq(commissionSettlements.statut, "confirmed"),
        ),
        orderBy: [desc(commissionSettlements.paidAt)],
        limit: input.settlementLimit,
      }),
    ]),
  );
  return { commissionLines, settlements };
}
