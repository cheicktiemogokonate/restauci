import "server-only";

import {
  and,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  lt,
  or,
  sql,
} from "drizzle-orm";
import { db, transactionalDb, type TransactionExecutor } from "@/infrastructure/db";
import {
  commandes,
  deliveryEvents,
  deliveryOffers,
  driverCashCollections,
  livraisons,
  livreurs,
} from "@/infrastructure/db/schema";
import type {
  CreateRestaurantDriverCommand,
  DriverFleetDTO,
  RestaurantDeliveryActor,
  UpdateRestaurantDriverCommand,
} from "../contracts";
import {
  DeliveryDomainError,
  getDriverAvailability,
  type DeliveryActorType,
  type DeliveryEventType,
  type DeliveryStatus,
} from "../model";

export interface PersistDeliveryEventInput {
  deliveryId?: string | null;
  orderId?: string | null;
  restaurantId: string;
  driverId?: string | null;
  offerId?: string | null;
  eventType: DeliveryEventType;
  actorType: DeliveryActorType;
  actorId: string;
  fromStatus?: DeliveryStatus | null;
  toStatus?: DeliveryStatus | null;
  metadata?: Record<string, unknown>;
  now?: Date;
}

export function persistDeliveryEvent(
  tx: TransactionExecutor,
  input: PersistDeliveryEventInput,
) {
  return tx.insert(deliveryEvents).values({
    id: crypto.randomUUID(),
    deliveryId: input.deliveryId ?? null,
    orderId: input.orderId ?? null,
    restaurantId: input.restaurantId,
    driverId: input.driverId ?? null,
    offerId: input.offerId ?? null,
    eventType: input.eventType,
    actorType: input.actorType,
    actorId: input.actorId,
    fromStatus: input.fromStatus ?? null,
    toStatus: input.toStatus ?? null,
    metadata: input.metadata ?? {},
    createdAt: input.now ?? new Date(),
  });
}

export async function createDriverWithCredentials(input: {
  actor: RestaurantDeliveryActor;
  command: CreateRestaurantDriverCommand;
  driverId: string;
  loginId: string;
  passwordHash: string;
  temporaryPasswordExpiresAt: Date;
  now: Date;
}) {
  return transactionalDb.transaction(async (tx) => {
    const [driver] = await tx
      .insert(livreurs)
      .values({
        id: input.driverId,
        restaurantId: input.actor.restaurantId,
        nom: input.command.nom,
        telephone: input.command.telephone,
        photoUrl: input.command.photoUrl ?? null,
        vehicule: input.command.vehicule,
        numeroVehicule: input.command.numeroVehicule ?? null,
        fixedDeliveryCompensationFcfa:
          input.command.fixedDeliveryCompensationFcfa ?? null,
        loginId: input.loginId,
        passwordHash: input.passwordHash,
        mustChangePassword: true,
        credentialsVersion: 1,
        credentialsIssuedAt: input.now,
        temporaryPasswordExpiresAt: input.temporaryPasswordExpiresAt,
        enLigne: false,
        actif: true,
        createdAt: input.now,
        updatedAt: input.now,
      })
      .returning({
        id: livreurs.id,
        loginId: livreurs.loginId,
        nom: livreurs.nom,
      });
    if (!driver) throw new Error("Création du livreur impossible.");

    await persistDeliveryEvent(tx, {
      restaurantId: input.actor.restaurantId,
      driverId: driver.id,
      eventType: "driver_created",
      actorType: "restaurant",
      actorId: input.actor.userId,
      now: input.now,
    });
    await persistDeliveryEvent(tx, {
      restaurantId: input.actor.restaurantId,
      driverId: driver.id,
      eventType: "driver_credentials_issued",
      actorType: "restaurant",
      actorId: input.actor.userId,
      metadata: { credentialsVersion: 1 },
      now: input.now,
    });
    return driver;
  });
}

export async function updateDriverProfile(input: {
  actor: RestaurantDeliveryActor;
  driverId: string;
  command: UpdateRestaurantDriverCommand;
  now: Date;
}) {
  return transactionalDb.transaction(async (tx) => {
    const [driver] = await tx
      .update(livreurs)
      .set({
        ...input.command,
        photoUrl: input.command.photoUrl,
        updatedAt: input.now,
      })
      .where(
        and(
          eq(livreurs.id, input.driverId),
          eq(livreurs.restaurantId, input.actor.restaurantId),
        ),
      )
      .returning({ id: livreurs.id });
    if (!driver) {
      throw new DeliveryDomainError("DRIVER_NOT_FOUND", "Livreur introuvable.");
    }
    await persistDeliveryEvent(tx, {
      restaurantId: input.actor.restaurantId,
      driverId: driver.id,
      eventType: "driver_updated",
      actorType: "restaurant",
      actorId: input.actor.userId,
      metadata: { changedFields: Object.keys(input.command).sort() },
      now: input.now,
    });
    return driver;
  });
}

export async function resetDriverCredentialsPersistence(input: {
  actor: RestaurantDeliveryActor;
  driverId: string;
  passwordHash: string;
  temporaryPasswordExpiresAt: Date;
  now: Date;
}) {
  return transactionalDb.transaction(async (tx) => {
    const [driver] = await tx
      .update(livreurs)
      .set({
        passwordHash: input.passwordHash,
        mustChangePassword: true,
        credentialsVersion: sql`${livreurs.credentialsVersion} + 1`,
        credentialsIssuedAt: input.now,
        temporaryPasswordExpiresAt: input.temporaryPasswordExpiresAt,
        passwordChangedAt: null,
        enLigne: false,
        updatedAt: input.now,
      })
      .where(
        and(
          eq(livreurs.id, input.driverId),
          eq(livreurs.restaurantId, input.actor.restaurantId),
          eq(livreurs.actif, true),
        ),
      )
      .returning({
        id: livreurs.id,
        loginId: livreurs.loginId,
        credentialsVersion: livreurs.credentialsVersion,
      });
    if (!driver) {
      throw new DeliveryDomainError(
        "DRIVER_NOT_FOUND",
        "Livreur actif introuvable.",
      );
    }
    const activeDelivery = await tx.query.livraisons.findFirst({
      where: and(
        eq(livraisons.livreurId, driver.id),
        inArray(livraisons.statut, ["assignee", "en_route"]),
      ),
      columns: { id: true },
    });
    if (activeDelivery) {
      throw new DeliveryDomainError(
        "DRIVER_BUSY",
        "Les accès ne peuvent pas être réinitialisés pendant une mission active.",
      );
    }
    const cancelledOffers = await tx
      .update(deliveryOffers)
      .set({ status: "cancelled", respondedAt: input.now, updatedAt: input.now })
      .where(
        and(
          eq(deliveryOffers.driverId, driver.id),
          eq(deliveryOffers.status, "pending"),
        ),
      )
      .returning({
        id: deliveryOffers.id,
        deliveryId: deliveryOffers.deliveryId,
        orderId: deliveryOffers.orderId,
      });
    for (const offer of cancelledOffers) {
      await persistDeliveryEvent(tx, {
        deliveryId: offer.deliveryId,
        orderId: offer.orderId,
        restaurantId: input.actor.restaurantId,
        driverId: driver.id,
        offerId: offer.id,
        eventType: "offer_cancelled",
        actorType: "restaurant",
        actorId: input.actor.userId,
        metadata: { reason: "credentials_reset" },
        now: input.now,
      });
    }
    await persistDeliveryEvent(tx, {
      restaurantId: input.actor.restaurantId,
      driverId: driver.id,
      eventType: "driver_credentials_reset",
      actorType: "restaurant",
      actorId: input.actor.userId,
      metadata: { credentialsVersion: driver.credentialsVersion },
      now: input.now,
    });
    return driver;
  });
}

export async function deactivateDriverPersistence(input: {
  actor: RestaurantDeliveryActor;
  driverId: string;
  now: Date;
}) {
  return transactionalDb.transaction(async (tx) => {
    const driver = await tx.query.livreurs.findFirst({
      where: and(
        eq(livreurs.id, input.driverId),
        eq(livreurs.restaurantId, input.actor.restaurantId),
      ),
      columns: { id: true, actif: true },
    });
    if (!driver) {
      throw new DeliveryDomainError("DRIVER_NOT_FOUND", "Livreur introuvable.");
    }
    if (!driver.actif) return { id: driver.id, alreadyDeactivated: true };

    const pendingOffers = await tx
      .update(deliveryOffers)
      .set({ status: "cancelled", respondedAt: input.now, updatedAt: input.now })
      .where(
        and(
          eq(deliveryOffers.driverId, driver.id),
          eq(deliveryOffers.status, "pending"),
        ),
      )
      .returning({
        id: deliveryOffers.id,
        deliveryId: deliveryOffers.deliveryId,
        orderId: deliveryOffers.orderId,
      });
    for (const offer of pendingOffers) {
      await persistDeliveryEvent(tx, {
        deliveryId: offer.deliveryId,
        orderId: offer.orderId,
        restaurantId: input.actor.restaurantId,
        driverId: driver.id,
        offerId: offer.id,
        eventType: "offer_cancelled",
        actorType: "restaurant",
        actorId: input.actor.userId,
        metadata: { reason: "driver_deactivated" },
        now: input.now,
      });
    }

    const activeDeliveries = await tx
      .select({
        id: livraisons.id,
        orderId: livraisons.commandeId,
        status: livraisons.statut,
      })
      .from(livraisons)
      .where(
        and(
          eq(livraisons.livreurId, driver.id),
          inArray(livraisons.statut, ["assignee", "en_route"]),
        ),
      );
    for (const delivery of activeDeliveries) {
      if (delivery.status === "assignee") {
        await tx
          .update(livraisons)
          .set({
            livreurId: null,
            statut: "en_attente",
            heureAssignee: null,
            driverCompensationAmountFcfa: null,
            driverCompensationPaidAt: null,
            driverCompensationPaidByUserId: null,
            driverCompensationPaymentNote: null,
            updatedAt: input.now,
          })
          .where(
            and(
              eq(livraisons.id, delivery.id),
              eq(livraisons.statut, "assignee"),
            ),
          );
        await persistDeliveryEvent(tx, {
          deliveryId: delivery.id,
          orderId: delivery.orderId,
          restaurantId: input.actor.restaurantId,
          driverId: driver.id,
          eventType: "delivery_unassigned",
          actorType: "restaurant",
          actorId: input.actor.userId,
          fromStatus: "assignee",
          toStatus: "en_attente",
          metadata: { reason: "driver_deactivated" },
          now: input.now,
        });
      } else {
        await tx
          .update(livraisons)
          .set({
            statut: "echouee",
            failureReason: "driver_deactivated",
            failureNote: "Compte livreur désactivé pendant la mission.",
            failedAt: input.now,
            updatedAt: input.now,
          })
          .where(
            and(
              eq(livraisons.id, delivery.id),
              eq(livraisons.statut, "en_route"),
            ),
          );
        await persistDeliveryEvent(tx, {
          deliveryId: delivery.id,
          orderId: delivery.orderId,
          restaurantId: input.actor.restaurantId,
          driverId: driver.id,
          eventType: "delivery_failed",
          actorType: "restaurant",
          actorId: input.actor.userId,
          fromStatus: "en_route",
          toStatus: "echouee",
          metadata: { reason: "driver_deactivated" },
          now: input.now,
        });
      }
    }

    await tx
      .update(livreurs)
      .set({
        actif: false,
        enLigne: false,
        deactivatedAt: input.now,
        deactivatedByUserId: input.actor.userId,
        credentialsVersion: sql`${livreurs.credentialsVersion} + 1`,
        updatedAt: input.now,
      })
      .where(and(eq(livreurs.id, driver.id), eq(livreurs.actif, true)));
    await persistDeliveryEvent(tx, {
      restaurantId: input.actor.restaurantId,
      driverId: driver.id,
      eventType: "driver_deactivated",
      actorType: "restaurant",
      actorId: input.actor.userId,
      now: input.now,
    });
    return { id: driver.id, alreadyDeactivated: false };
  });
}

export async function findDriverAuthRecordByLoginId(loginId: string) {
  const [driver] = await db
    .select({
      id: livreurs.id,
      restaurantId: livreurs.restaurantId,
      loginId: livreurs.loginId,
      passwordHash: livreurs.passwordHash,
      mustChangePassword: livreurs.mustChangePassword,
      credentialsVersion: livreurs.credentialsVersion,
      temporaryPasswordExpiresAt: livreurs.temporaryPasswordExpiresAt,
      active: livreurs.actif,
      name: livreurs.nom,
    })
    .from(livreurs)
    .where(eq(livreurs.loginId, loginId.trim().toUpperCase()))
    .limit(1);
  return driver ?? null;
}

export async function findDriverSessionRecord(driverId: string) {
  const [driver] = await db
    .select({
      id: livreurs.id,
      restaurantId: livreurs.restaurantId,
      name: livreurs.nom,
      phone: livreurs.telephone,
      photoUrl: livreurs.photoUrl,
      vehicle: livreurs.vehicule,
      vehicleNumber: livreurs.numeroVehicule,
      active: livreurs.actif,
      declaredAvailable: livreurs.enLigne,
      passwordHash: livreurs.passwordHash,
      mustChangePassword: livreurs.mustChangePassword,
      credentialsVersion: livreurs.credentialsVersion,
      lastSeenAt: livreurs.lastSeenAt,
    })
    .from(livreurs)
    .where(eq(livreurs.id, driverId))
    .limit(1);
  return driver ?? null;
}

export async function activateDriverPasswordPersistence(input: {
  driverId: string;
  restaurantId: string;
  credentialsVersion: number;
  passwordHash: string;
  now: Date;
}) {
  return transactionalDb.transaction(async (tx) => {
    const [driver] = await tx
      .update(livreurs)
      .set({
        passwordHash: input.passwordHash,
        mustChangePassword: false,
        credentialsVersion: sql`${livreurs.credentialsVersion} + 1`,
        passwordChangedAt: input.now,
        temporaryPasswordExpiresAt: null,
        lastLoginAt: input.now,
        updatedAt: input.now,
      })
      .where(
        and(
          eq(livreurs.id, input.driverId),
          eq(livreurs.restaurantId, input.restaurantId),
          eq(livreurs.actif, true),
          eq(livreurs.mustChangePassword, true),
          eq(livreurs.credentialsVersion, input.credentialsVersion),
          gt(livreurs.temporaryPasswordExpiresAt, input.now),
        ),
      )
      .returning({
        id: livreurs.id,
        restaurantId: livreurs.restaurantId,
        credentialsVersion: livreurs.credentialsVersion,
      });
    if (!driver) {
      throw new DeliveryDomainError(
        "DRIVER_ACTIVATION_INVALID",
        "Ce lien d'activation est invalide ou expiré.",
      );
    }
    await persistDeliveryEvent(tx, {
      restaurantId: driver.restaurantId,
      driverId: driver.id,
      eventType: "driver_credentials_activated",
      actorType: "driver",
      actorId: driver.id,
      metadata: { credentialsVersion: driver.credentialsVersion },
      now: input.now,
    });
    return driver;
  });
}

export async function recordDriverLogin(driverId: string, now = new Date()) {
  await db
    .update(livreurs)
    .set({ lastLoginAt: now, lastSeenAt: now, updatedAt: now })
    .where(eq(livreurs.id, driverId));
}

export async function touchDriverLastSeen(driverId: string, now = new Date()) {
  await db
    .update(livreurs)
    .set({ lastSeenAt: now })
    .where(
      and(
        eq(livreurs.id, driverId),
        or(
          isNull(livreurs.lastSeenAt),
          lt(livreurs.lastSeenAt, new Date(now.getTime() - 60_000)),
        ),
      ),
    );
}

function normalizeVehicle(value: string | null): DriverFleetDTO["vehicule"] {
  const normalized = value?.trim().toLowerCase();
  if (
    normalized === "moto" ||
    normalized === "velo" ||
    normalized === "voiture" ||
    normalized === "tricycle"
  ) {
    return normalized;
  }
  return "autre";
}

export async function listRestaurantDriversPersistence(restaurantId: string) {
  const rows = await db
    .select({
      id: livreurs.id,
      nom: livreurs.nom,
      telephone: livreurs.telephone,
      photoUrl: livreurs.photoUrl,
      vehicule: livreurs.vehicule,
      numeroVehicule: livreurs.numeroVehicule,
      fixedDeliveryCompensationFcfa:
        livreurs.fixedDeliveryCompensationFcfa,
      active: livreurs.actif,
      declaredAvailable: livreurs.enLigne,
      passwordHash: livreurs.passwordHash,
      mustChangePassword: livreurs.mustChangePassword,
      credentialsIssuedAt: livreurs.credentialsIssuedAt,
      lastSeenAt: livreurs.lastSeenAt,
    })
    .from(livreurs)
    .where(eq(livreurs.restaurantId, restaurantId))
    .orderBy(desc(livreurs.createdAt));
  if (rows.length === 0) return [];
  const driverIds = rows.map((row) => row.id);
  const now = new Date();
  const [activeRows, offerRows, cashRows, compensationRows, compensationTotals] =
    await Promise.all([
    db
      .select({
        driverId: livraisons.livreurId,
        orderNumber: commandes.numero,
      })
      .from(livraisons)
      .innerJoin(commandes, eq(commandes.id, livraisons.commandeId))
      .where(
        and(
          inArray(livraisons.livreurId, driverIds),
          inArray(livraisons.statut, ["assignee", "en_route"]),
        ),
      ),
    db
      .select({ driverId: deliveryOffers.driverId })
      .from(deliveryOffers)
      .where(
        and(
          inArray(deliveryOffers.driverId, driverIds),
          eq(deliveryOffers.status, "pending"),
          gt(deliveryOffers.expiresAt, now),
        ),
      ),
    db
      .select({
        driverId: driverCashCollections.driverId,
        deliveryId: driverCashCollections.deliveryId,
        orderNumber: commandes.numero,
        amountFcfa: driverCashCollections.collectedAmountFcfa,
        collectedAt: driverCashCollections.collectedAt,
      })
      .from(driverCashCollections)
      .innerJoin(commandes, eq(commandes.id, driverCashCollections.orderId))
      .where(
        and(
          inArray(driverCashCollections.driverId, driverIds),
          eq(driverCashCollections.status, "held"),
        ),
      )
      .orderBy(desc(driverCashCollections.collectedAt)),
    db
      .select({
        driverId: livraisons.livreurId,
        deliveryId: livraisons.id,
        orderNumber: commandes.numero,
        amountFcfa: livraisons.driverCompensationAmountFcfa,
        completedAt: livraisons.heureLivree,
        paidAt: livraisons.driverCompensationPaidAt,
        paymentNote: livraisons.driverCompensationPaymentNote,
      })
      .from(livraisons)
      .innerJoin(commandes, eq(commandes.id, livraisons.commandeId))
      .where(
        and(
          inArray(livraisons.livreurId, driverIds),
          eq(livraisons.statut, "livree"),
          isNotNull(livraisons.driverCompensationAmountFcfa),
        ),
      )
      .orderBy(desc(livraisons.heureLivree))
      .limit(Math.max(driverIds.length * 20, 100)),
    db
      .select({
        driverId: livraisons.livreurId,
        amountFcfa: sql<number>`COALESCE(SUM(${livraisons.driverCompensationAmountFcfa}), 0)`,
      })
      .from(livraisons)
      .innerJoin(commandes, eq(commandes.id, livraisons.commandeId))
      .where(
        and(
          inArray(livraisons.livreurId, driverIds),
          eq(commandes.restaurantId, restaurantId),
          eq(livraisons.statut, "livree"),
          isNotNull(livraisons.driverCompensationAmountFcfa),
          isNull(livraisons.driverCompensationPaidAt),
        ),
      )
      .groupBy(livraisons.livreurId),
  ]);
  const activeByDriver = new Map(
    activeRows.flatMap((row) =>
      row.driverId ? [[row.driverId, row.orderNumber] as const] : [],
    ),
  );
  const offeredDrivers = new Set(offerRows.map((row) => row.driverId));
  const cashByDriver = new Map<
    string,
    DriverFleetDTO["pendingCashDeliveries"]
  >();
  for (const cash of cashRows) {
    const items = cashByDriver.get(cash.driverId) ?? [];
    items.push({
      deliveryId: cash.deliveryId,
      orderNumber: cash.orderNumber,
      amountFcfa: cash.amountFcfa,
      collectedAt: cash.collectedAt.toISOString(),
    });
    cashByDriver.set(cash.driverId, items);
  }
  const compensationByDriver = new Map<
    string,
    DriverFleetDTO["compensationHistory"]
  >();
  for (const compensation of compensationRows) {
    if (!compensation.driverId || compensation.amountFcfa === null) continue;
    const items = compensationByDriver.get(compensation.driverId) ?? [];
    if (items.length >= 20) continue;
    items.push({
      deliveryId: compensation.deliveryId,
      orderNumber: compensation.orderNumber,
      amountFcfa: compensation.amountFcfa,
      completedAt: compensation.completedAt?.toISOString() ?? null,
      paidAt: compensation.paidAt?.toISOString() ?? null,
      paymentNote: compensation.paymentNote,
    });
    compensationByDriver.set(compensation.driverId, items);
  }
  const compensationTotalByDriver = new Map(
    compensationTotals.flatMap((row) =>
      row.driverId ? [[row.driverId, Number(row.amountFcfa)] as const] : [],
    ),
  );
  return rows.map((row): DriverFleetDTO => {
    const credentialsReady = Boolean(row.passwordHash) && !row.mustChangePassword;
    return {
      id: row.id,
      nom: row.nom,
      telephone: row.telephone,
      photoUrl: row.photoUrl,
      vehicule: normalizeVehicle(row.vehicule),
      numeroVehicule: row.numeroVehicule,
      fixedDeliveryCompensationFcfa: row.fixedDeliveryCompensationFcfa,
      active: row.active,
      declaredAvailable: row.declaredAvailable,
      availability: getDriverAvailability({
        active: row.active,
        credentialsReady,
        declaredAvailable: row.declaredAvailable,
        hasActiveDelivery: activeByDriver.has(row.id),
        hasPendingOffer: offeredDrivers.has(row.id),
      }),
      credentialsIssued: Boolean(row.credentialsIssuedAt),
      credentialsReady,
      lastSeenAt: row.lastSeenAt?.toISOString() ?? null,
      activeDeliveryNumber: activeByDriver.get(row.id) ?? null,
      pendingCashFcfa: (cashByDriver.get(row.id) ?? []).reduce(
        (total, item) => total + item.amountFcfa,
        0,
      ),
      pendingCashDeliveries: cashByDriver.get(row.id) ?? [],
      pendingCompensationFcfa: compensationTotalByDriver.get(row.id) ?? 0,
      compensationHistory: compensationByDriver.get(row.id) ?? [],
    };
  });
}
