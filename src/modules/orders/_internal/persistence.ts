import "server-only";

import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { db, type DbExecutor } from "@/infrastructure/db";
import {
  commandes,
  commissions,
  financialTransactions,
  payments,
  restaurants,
} from "@/infrastructure/db/schema";
import type { z } from "zod";
import type {
  adminRestaurantOrdersSchema,
  restaurantOrderListSchema,
} from "../contracts";

type AdminRestaurantOrders = z.output<typeof adminRestaurantOrdersSchema>;
type RestaurantOrderList = z.output<typeof restaurantOrderListSchema>;

function restaurantOrderListConditions(
  restaurantId: string,
  input: RestaurantOrderList,
) {
  const conditions = [eq(commandes.restaurantId, restaurantId)];
  if (input.lifecycle === "visible") {
    conditions.push(ne(commandes.statut, "en_attente_paiement"));
  } else if (input.lifecycle === "history") {
    conditions.push(inArray(commandes.statut, ["servie", "annulee"]));
  }
  if (input.statut) conditions.push(eq(commandes.statut, input.statut));
  if (input.modeCommande) {
    conditions.push(eq(commandes.modeCommande, input.modeCommande));
  }
  if (input.dateDebut) conditions.push(gte(commandes.createdAt, input.dateDebut));
  if (input.dateFin) conditions.push(lte(commandes.createdAt, input.dateFin));
  if (input.search) {
    const pattern = `%${input.search}%`;
    conditions.push(
      or(
        ilike(commandes.numero, pattern),
        ilike(commandes.nomClient, pattern),
        ilike(commandes.telephoneClient, pattern),
      )!,
    );
  }
  return conditions;
}

export async function listRestaurantOrderRecords(
  restaurantId: string,
  input: RestaurantOrderList,
) {
  const where = and(...restaurantOrderListConditions(restaurantId, input));
  const [items, totalRows] = await Promise.all([
    db.query.commandes.findMany({
      where,
      orderBy: [desc(commandes.createdAt)],
      offset: (input.page - 1) * input.limit,
      limit: input.limit,
      with: {
        financialTransaction: { with: { payments: true } },
        livraison: true,
      },
    }),
    db.select({ total: count() }).from(commandes).where(where),
  ]);
  const total = Number(totalRows[0]?.total ?? 0);
  return {
    items,
    total,
    page: input.page,
    limit: input.limit,
    totalPages: Math.ceil(total / input.limit),
  };
}

export function getRestaurantOrderRecord(
  orderId: string,
  restaurantId: string,
) {
  return db.query.commandes.findFirst({
    where: and(
      eq(commandes.id, orderId),
      eq(commandes.restaurantId, restaurantId),
    ),
    with: {
      client: true,
      financialTransaction: { with: { payments: true } },
      livraison: { with: { livreur: true } },
      avis: true,
    },
  });
}

export async function listClientOrderRecords(input: {
  clientId: string;
  search?: string;
  page: number;
  limit: number;
}) {
  const where = and(
    eq(commandes.clientId, input.clientId),
    ...(input.search ? [ilike(commandes.numero, `%${input.search}%`)] : []),
  );
  const [items, totalRows] = await Promise.all([
    db
      .select({
        id: commandes.id,
        numero: commandes.numero,
        statut: commandes.statut,
        total: commandes.total,
        modeCommande: commandes.modeCommande,
        items: commandes.items,
        createdAt: commandes.createdAt,
        restaurantId: commandes.restaurantId,
      })
      .from(commandes)
      .where(where)
      .orderBy(desc(commandes.createdAt))
      .limit(input.limit)
      .offset((input.page - 1) * input.limit),
    db.select({ total: count() }).from(commandes).where(where),
  ]);
  return { items, total: Number(totalRows[0]?.total ?? 0) };
}

export function getClientOrderRecord(orderId: string, clientId: string) {
  return db.query.commandes.findFirst({
    where: and(eq(commandes.id, orderId), eq(commandes.clientId, clientId)),
    with: {
      restaurant: { columns: { id: true, nom: true, adresse: true, telephone: true } },
      financialTransaction: { with: { payments: true } },
    },
  });
}

export function getClientOrderStateRecord(orderId: string, clientId: string) {
  return db.query.commandes.findFirst({
    where: and(eq(commandes.id, orderId), eq(commandes.clientId, clientId)),
    columns: { id: true, statut: true, updatedAt: true },
  });
}

export function getRestaurantOrderPaymentStateRecord(
  orderId: string,
  executor: DbExecutor = db,
) {
  return executor.query.commandes.findFirst({
    where: eq(commandes.id, orderId),
    columns: { id: true, statut: true, total: true },
  });
}

export function getDeliveryOrderContextRecord(
  orderId: string,
  restaurantId: string,
  executor: DbExecutor = db,
) {
  return executor.query.commandes.findFirst({
    where: and(
      eq(commandes.id, orderId),
      eq(commandes.restaurantId, restaurantId),
    ),
    columns: {
      id: true,
      numero: true,
      restaurantId: true,
      modeCommande: true,
      statut: true,
      adresseLivraison: true,
      latitudeLivraison: true,
      longitudeLivraison: true,
      distanceKm: true,
    },
  });
}

export async function getAdminOrderDetailRecord(orderId: string) {
  const [orderRows, paymentRows] = await Promise.all([
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
        clientNom: commandes.nomClient,
        clientTelephone: commandes.telephoneClient,
        commissionTauxBps: commissions.rateBpsSnapshot,
        commissionMontant: commissions.amountFcfa,
        commissionStatut: commissions.commercialStatus,
      })
      .from(commandes)
      .innerJoin(restaurants, eq(commandes.restaurantId, restaurants.id))
      .leftJoin(commissions, eq(commissions.commandeId, commandes.id))
      .where(eq(commandes.id, orderId))
      .limit(1),
    db
      .select({
        paiementMontant: payments.amountFcfa,
        paiementMethode: payments.method,
        paiementStatut: payments.status,
        paiementReference: payments.providerReference,
        paiementPayeAt: payments.confirmedAt,
      })
      .from(payments)
      .innerJoin(
        financialTransactions,
        eq(payments.transactionId, financialTransactions.id),
      )
      .where(eq(financialTransactions.restaurantOrderId, orderId))
      .orderBy(desc(payments.createdAt))
      .limit(1),
  ]);
  const order = orderRows[0];
  if (!order) return null;
  return {
    ...order,
    paiementMontant: paymentRows[0]?.paiementMontant ?? null,
    paiementMethode: paymentRows[0]?.paiementMethode ?? null,
    paiementStatut: paymentRows[0]?.paiementStatut ?? null,
    paiementReference: paymentRows[0]?.paiementReference ?? null,
    paiementPayeAt: paymentRows[0]?.paiementPayeAt ?? null,
  };
}

export async function countActiveRestaurantOrders(
  restaurantId: string,
  executor: DbExecutor = db,
) {
  const [row] = await executor
    .select({ value: count() })
    .from(commandes)
    .where(
      and(
        eq(commandes.restaurantId, restaurantId),
        inArray(commandes.statut, ["recue", "en_preparation"]),
      ),
    );
  return Number(row?.value ?? 0);
}

export async function listAdminRestaurantOrderRecords(
  input: AdminRestaurantOrders,
) {
  const conditions = [eq(commandes.restaurantId, input.restaurantId)];
  if (input.statut) conditions.push(eq(commandes.statut, input.statut));
  if (input.dateDebut) conditions.push(gte(commandes.createdAt, input.dateDebut));
  if (input.dateFin) conditions.push(lte(commandes.createdAt, input.dateFin));
  const where = and(...conditions);
  const offset = (input.page - 1) * input.limit;
  const [items, totalRows] = await Promise.all([
    db
      .select({
        id: commandes.id,
        numero: commandes.numero,
        nomClient: commandes.nomClient,
        statut: commandes.statut,
        modeCommande: commandes.modeCommande,
        total: commandes.total,
        createdAt: commandes.createdAt,
      })
      .from(commandes)
      .where(where)
      .orderBy(desc(commandes.createdAt))
      .limit(input.limit)
      .offset(offset),
    db.select({ total: count() }).from(commandes).where(where),
  ]);
  const total = Number(totalRows[0]?.total ?? 0);
  return {
    items,
    total,
    page: input.page,
    totalPages: Math.ceil(total / input.limit),
  };
}

export function getAdminRestaurantOrderEvolutionRecords(
  restaurantId: string,
  days: number,
) {
  const start = new Date();
  start.setDate(start.getDate() - days);
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
        gte(commandes.createdAt, start),
      ),
    )
    .groupBy(sql`DATE(${commandes.createdAt} AT TIME ZONE 'UTC')`)
    .orderBy(sql`DATE(${commandes.createdAt} AT TIME ZONE 'UTC')`);
}
