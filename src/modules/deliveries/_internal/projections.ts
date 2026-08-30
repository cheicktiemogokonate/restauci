import "server-only";

import {
  and,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  or,
  sql,
} from "drizzle-orm";
import { db } from "@/infrastructure/db";
import {
  commandes,
  deliveryEvents,
  deliveryOffers,
  driverCashCollections,
  financialTransactions,
  livraisons,
  livreurs,
  payments,
  restaurants,
} from "@/lib/db/schema";
import type {
  ClientDeliveryDTO,
  DeliveryOfferDTO,
  DriverMeDTO,
  DriverMissionDTO,
  ListDriverDeliveriesCommand,
} from "../contracts";
import { DeliveryDomainError, getDriverAvailability } from "../model";
import { deriveDeliveryProofCode } from "./proof";

async function cashByOrder(orderIds: string[]) {
  if (orderIds.length === 0) return new Map<string, number | null>();
  const rows = await db
    .select({
      orderId: financialTransactions.restaurantOrderId,
      method: payments.method,
      status: payments.status,
      amountFcfa: payments.amountFcfa,
      createdAt: payments.createdAt,
    })
    .from(payments)
    .innerJoin(
      financialTransactions,
      eq(financialTransactions.id, payments.transactionId),
    )
    .where(
      and(
        inArray(financialTransactions.restaurantOrderId, orderIds),
        or(
          eq(payments.status, "confirmed"),
          and(eq(payments.status, "pending"), eq(payments.method, "cash")),
        ),
      ),
    )
    .orderBy(desc(payments.createdAt));
  const result = new Map<
    string,
    { amount: number | null; priority: number }
  >();
  for (const row of rows) {
    if (!row.orderId) continue;
    const priority = row.status === "confirmed" ? 2 : 1;
    if ((result.get(row.orderId)?.priority ?? 0) >= priority) continue;
    result.set(row.orderId, {
      amount: row.method === "cash" ? row.amountFcfa : null,
      priority,
    });
  }
  return new Map(
    [...result].map(([orderId, value]) => [orderId, value.amount]),
  );
}

export async function getDriverMeProjection(input: {
  driverId: string;
  restaurantId: string;
}): Promise<DriverMeDTO> {
  const [driver] = await db
    .select({
      id: livreurs.id,
      nom: livreurs.nom,
      telephone: livreurs.telephone,
      photoUrl: livreurs.photoUrl,
      vehicule: livreurs.vehicule,
      numeroVehicule: livreurs.numeroVehicule,
      restaurantName: restaurants.nom,
      fixedDeliveryCompensationFcfa:
        livreurs.fixedDeliveryCompensationFcfa,
      actif: livreurs.actif,
      enLigne: livreurs.enLigne,
      passwordHash: livreurs.passwordHash,
      mustChangePassword: livreurs.mustChangePassword,
      lastSeenAt: livreurs.lastSeenAt,
    })
    .from(livreurs)
    .innerJoin(restaurants, eq(restaurants.id, livreurs.restaurantId))
    .where(
      and(
        eq(livreurs.id, input.driverId),
        eq(livreurs.restaurantId, input.restaurantId),
      ),
    )
    .limit(1);
  if (!driver) {
    throw new DeliveryDomainError("DRIVER_NOT_FOUND", "Livreur introuvable.");
  }
  const now = new Date();
  const [
    activeDelivery,
    pendingOffer,
    [{ pendingCashFcfa }],
    [{ pendingCompensationFcfa }],
  ] = await Promise.all([
    db.query.livraisons.findFirst({
      where: and(
        eq(livraisons.livreurId, driver.id),
        inArray(livraisons.statut, ["assignee", "en_route"]),
      ),
      columns: { id: true },
    }),
    db.query.deliveryOffers.findFirst({
      where: and(
        eq(deliveryOffers.driverId, driver.id),
        eq(deliveryOffers.status, "pending"),
        gt(deliveryOffers.expiresAt, now),
      ),
      columns: { id: true },
    }),
    db
      .select({
        pendingCashFcfa: sql<number>`COALESCE(SUM(${driverCashCollections.collectedAmountFcfa}), 0)`,
      })
      .from(driverCashCollections)
      .where(
        and(
          eq(driverCashCollections.driverId, driver.id),
          eq(driverCashCollections.status, "held"),
        ),
      ),
    db
      .select({
        pendingCompensationFcfa: sql<number>`COALESCE(SUM(${livraisons.driverCompensationAmountFcfa}), 0)`,
      })
      .from(livraisons)
      .innerJoin(commandes, eq(commandes.id, livraisons.commandeId))
      .where(
        and(
          eq(livraisons.livreurId, driver.id),
          eq(commandes.restaurantId, input.restaurantId),
          eq(livraisons.statut, "livree"),
          isNotNull(livraisons.driverCompensationAmountFcfa),
          isNull(livraisons.driverCompensationPaidAt),
        ),
      ),
  ]);
  const credentialsReady = Boolean(driver.passwordHash) && !driver.mustChangePassword;
  return {
    id: driver.id,
    name: driver.nom,
    phone: driver.telephone,
    photoUrl: driver.photoUrl,
    vehicle: driver.vehicule,
    vehicleNumber: driver.numeroVehicule,
    restaurantName: driver.restaurantName,
    fixedDeliveryCompensationFcfa:
      driver.fixedDeliveryCompensationFcfa,
    declaredAvailable: driver.enLigne,
    availability: getDriverAvailability({
      active: driver.actif,
      credentialsReady,
      declaredAvailable: driver.enLigne,
      hasActiveDelivery: Boolean(activeDelivery),
      hasPendingOffer: Boolean(pendingOffer),
    }),
    lastSeenAt: driver.lastSeenAt?.toISOString() ?? null,
    pendingCashFcfa: Number(pendingCashFcfa),
    pendingCompensationFcfa: Number(pendingCompensationFcfa),
  };
}

export async function getPendingDriverOfferProjection(input: {
  driverId: string;
  restaurantId: string;
}): Promise<DeliveryOfferDTO | null> {
  const now = new Date();
  const [row] = await db
    .select({
      id: deliveryOffers.id,
      deliveryId: deliveryOffers.deliveryId,
      status: deliveryOffers.status,
      expiresAt: deliveryOffers.expiresAt,
      orderId: commandes.id,
      orderNumber: commandes.numero,
      distanceKm: commandes.distanceKm,
      restaurantName: restaurants.nom,
      restaurantAddress: restaurants.adresse,
      compensationAmountFcfa:
        deliveryOffers.driverCompensationAmountFcfa,
    })
    .from(deliveryOffers)
    .innerJoin(commandes, eq(commandes.id, deliveryOffers.orderId))
    .innerJoin(restaurants, eq(restaurants.id, deliveryOffers.restaurantId))
    .where(
      and(
        eq(deliveryOffers.driverId, input.driverId),
        eq(deliveryOffers.restaurantId, input.restaurantId),
        eq(deliveryOffers.status, "pending"),
        gt(deliveryOffers.expiresAt, now),
      ),
    )
    .limit(1);
  if (!row) return null;
  const cash = await cashByOrder([row.orderId]);
  return {
    id: row.id,
    deliveryId: row.deliveryId,
    orderNumber: row.orderNumber,
    status: row.status,
    expiresAt: row.expiresAt.toISOString(),
    pickupRestaurantName: row.restaurantName,
    pickupAddress: row.restaurantAddress,
    deliveryArea: "Adresse complète disponible après acceptation",
    distanceKm: row.distanceKm,
    cashToCollectFcfa: cash.get(row.orderId) ?? null,
    compensationAmountFcfa: row.compensationAmountFcfa,
  };
}

function toMission(
  row: {
    id: string;
    orderId: string;
    orderNumber: string;
    status: DriverMissionDTO["status"];
    orderStatus: "en_attente_paiement" | "recue" | "en_preparation" | "prete" | "servie" | "annulee";
    restaurantName: string;
    restaurantAddress: string;
    restaurantPhone: string;
    customerName: string;
    customerPhone: string | null;
    customerAddress: string | null;
    latitude: number | null;
    longitude: number | null;
    instructions: string | null;
    proofMethod: DriverMissionDTO["proofMethod"];
    assignedAt: Date | null;
    startedAt: Date | null;
    completedAt: Date | null;
    compensationAmountFcfa: number | null;
    compensationPaidAt: Date | null;
  },
  cashToCollectFcfa: number | null,
): DriverMissionDTO {
  const privateDetailsVisible = row.status === "assignee" || row.status === "en_route";
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    status: row.status,
    pickupReady: row.orderStatus === "prete",
    restaurant: {
      name: row.restaurantName,
      address: row.restaurantAddress,
      phone: row.restaurantPhone,
    },
    customer: {
      name: row.customerName,
      phone: privateDetailsVisible ? row.customerPhone : null,
      address: privateDetailsVisible ? row.customerAddress : null,
      latitude: privateDetailsVisible ? row.latitude : null,
      longitude: privateDetailsVisible ? row.longitude : null,
      instructions: privateDetailsVisible ? row.instructions : null,
    },
    cashToCollectFcfa,
    compensationAmountFcfa: row.compensationAmountFcfa,
    compensationPaidAt: row.compensationPaidAt?.toISOString() ?? null,
    proofMethod: row.proofMethod,
    assignedAt: row.assignedAt?.toISOString() ?? null,
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

function driverMissionSelect() {
  return db
    .select({
      id: livraisons.id,
      orderId: commandes.id,
      orderNumber: commandes.numero,
      status: livraisons.statut,
      orderStatus: commandes.statut,
      restaurantName: restaurants.nom,
      restaurantAddress: restaurants.adresse,
      restaurantPhone: restaurants.telephone,
      customerName: commandes.nomClient,
      customerPhone: commandes.telephoneClient,
      customerAddress: commandes.adresseLivraison,
      latitude: commandes.latitudeLivraison,
      longitude: commandes.longitudeLivraison,
      instructions: commandes.noteClient,
      proofMethod: livraisons.proofMethod,
      assignedAt: livraisons.heureAssignee,
      startedAt: livraisons.heureDepart,
      completedAt: livraisons.heureLivree,
      compensationAmountFcfa: livraisons.driverCompensationAmountFcfa,
      compensationPaidAt: livraisons.driverCompensationPaidAt,
      createdAt: livraisons.createdAt,
    })
    .from(livraisons)
    .innerJoin(commandes, eq(commandes.id, livraisons.commandeId))
    .innerJoin(restaurants, eq(restaurants.id, commandes.restaurantId));
}

export async function listDriverDeliveriesProjection(input: {
  driverId: string;
  restaurantId: string;
  pagination: ListDriverDeliveriesCommand;
}) {
  const where = and(
    eq(livraisons.livreurId, input.driverId),
    eq(commandes.restaurantId, input.restaurantId),
  );
  const offset = (input.pagination.page - 1) * input.pagination.limit;
  const [rows, [{ total }]] = await Promise.all([
    driverMissionSelect()
      .where(where)
      .orderBy(desc(livraisons.createdAt))
      .limit(input.pagination.limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(livraisons)
      .innerJoin(commandes, eq(commandes.id, livraisons.commandeId))
      .where(where),
  ]);
  const cash = await cashByOrder(rows.map((row) => row.orderId));
  return {
    items: rows.map((row) => toMission(row, cash.get(row.orderId) ?? null)),
    total: Number(total),
    page: input.pagination.page,
    limit: input.pagination.limit,
  };
}

export async function getDriverDeliveryProjection(input: {
  driverId: string;
  restaurantId: string;
  deliveryId: string;
}) {
  const [row] = await driverMissionSelect()
    .where(
      and(
        eq(livraisons.id, input.deliveryId),
        eq(livraisons.livreurId, input.driverId),
        eq(commandes.restaurantId, input.restaurantId),
      ),
    )
    .limit(1);
  if (!row) {
    throw new DeliveryDomainError("DELIVERY_NOT_FOUND", "Livraison introuvable.");
  }
  const cash = await cashByOrder([row.orderId]);
  return toMission(row, cash.get(row.orderId) ?? null);
}

export async function getClientDeliveryProjection(input: {
  clientId: string;
  orderId: string;
}): Promise<ClientDeliveryDTO | null> {
  const [row] = await db
    .select({
      id: livraisons.id,
      status: livraisons.statut,
      proofNonce: livraisons.proofCodeNonce,
      proofVerifiedAt: livraisons.proofVerifiedAt,
      assignedAt: livraisons.heureAssignee,
      startedAt: livraisons.heureDepart,
      completedAt: livraisons.heureLivree,
      driverName: livreurs.nom,
      driverPhone: livreurs.telephone,
      driverPhotoUrl: livreurs.photoUrl,
      vehicle: livreurs.vehicule,
      vehicleNumber: livreurs.numeroVehicule,
      restaurantName: restaurants.nom,
    })
    .from(livraisons)
    .innerJoin(commandes, eq(commandes.id, livraisons.commandeId))
    .innerJoin(restaurants, eq(restaurants.id, commandes.restaurantId))
    .leftJoin(livreurs, eq(livreurs.id, livraisons.livreurId))
    .where(and(eq(commandes.id, input.orderId), eq(commandes.clientId, input.clientId)))
    .limit(1);
  if (!row) return null;
  const proofRequired = row.status === "en_route" && !row.proofVerifiedAt;
  return {
    id: row.id,
    status: row.status,
    driver:
      row.driverName && row.driverPhone && row.vehicle
        ? {
            name: row.driverName,
            phone: row.driverPhone,
            photoUrl: row.driverPhotoUrl,
            vehicle: row.vehicle,
            vehicleNumber: row.vehicleNumber,
            restaurantName: row.restaurantName,
          }
        : null,
    proofRequired,
    proofCode:
      proofRequired && row.proofNonce
        ? deriveDeliveryProofCode(row.id, row.proofNonce)
        : null,
    assignedAt: row.assignedAt?.toISOString() ?? null,
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

export async function getRestaurantDeliveryProjection(input: {
  restaurantId: string;
  orderId: string;
}) {
  const delivery = await db.query.livraisons.findFirst({
    where: eq(livraisons.commandeId, input.orderId),
    columns: {
      id: true,
      commandeId: true,
      livreurId: true,
      statut: true,
      heureAssignee: true,
      heureDepart: true,
      heureLivree: true,
      failureReason: true,
      failureNote: true,
      failedAt: true,
      cashCollectedAmountFcfa: true,
      driverCompensationAmountFcfa: true,
      driverCompensationPaidAt: true,
      driverCompensationPaymentNote: true,
    },
    with: {
      commande: { columns: { restaurantId: true } },
      livreur: {
        columns: {
          nom: true,
          telephone: true,
          vehicule: true,
          numeroVehicule: true,
        },
      },
    },
  });
  if (!delivery || delivery.commande.restaurantId !== input.restaurantId) return null;
  const events = await db
    .select({
      id: deliveryEvents.id,
      type: deliveryEvents.eventType,
      actorType: deliveryEvents.actorType,
      fromStatus: deliveryEvents.fromStatus,
      toStatus: deliveryEvents.toStatus,
      metadata: deliveryEvents.metadata,
      createdAt: deliveryEvents.createdAt,
    })
    .from(deliveryEvents)
    .where(
      and(
        eq(deliveryEvents.deliveryId, delivery.id),
        eq(deliveryEvents.restaurantId, input.restaurantId),
      ),
    )
    .orderBy(desc(deliveryEvents.createdAt));
  return {
    id: delivery.id,
    orderId: delivery.commandeId,
    driverId: delivery.livreurId,
    status: delivery.statut,
    driver: delivery.livreur,
    assignedAt: delivery.heureAssignee?.toISOString() ?? null,
    startedAt: delivery.heureDepart?.toISOString() ?? null,
    completedAt: delivery.heureLivree?.toISOString() ?? null,
    failedAt: delivery.failedAt?.toISOString() ?? null,
    failureReason: delivery.failureReason,
    failureNote: delivery.failureNote,
    cashCollectedAmountFcfa: delivery.cashCollectedAmountFcfa,
    driverCompensationAmountFcfa:
      delivery.driverCompensationAmountFcfa,
    driverCompensationPaidAt:
      delivery.driverCompensationPaidAt?.toISOString() ?? null,
    driverCompensationPaymentNote:
      delivery.driverCompensationPaymentNote,
    events: events.map((event) => ({
      ...event,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}
