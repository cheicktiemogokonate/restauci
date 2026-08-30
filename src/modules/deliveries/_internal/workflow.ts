import "server-only";

import {
  and,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { transactionalDb } from "@/infrastructure/db";
import {
  commandes,
  deliveryOffers,
  driverCashCollections,
  driverCashRemittances,
  livraisons,
  livreurs,
} from "@/lib/db/schema";
import {
  persistNotification,
  scheduleClientNotification,
  scheduleDriverNotification,
} from "@/lib/notifications";
import {
  cancelDeliveryOrderInTransaction,
  completeDeliveryOrderInTransaction,
  scheduleCancelledDeliveryOrderEffects,
  scheduleCompletedDeliveryOrderEffects,
} from "@/modules/orders/server";
import { getRestaurantOrderPaymentSummaryInTransaction } from "@/modules/transactions/server";
import type {
  ConfirmDriverCashRemittanceCommand,
  ConfirmDriverCompensationPaymentCommand,
  FailDriverDeliveryCommand,
  RespondToDeliveryOfferCommand,
} from "../contracts";
import {
  DeliveryDomainError,
  assertDeliveryCanComplete,
  assertDeliveryCanStart,
  assertOfferCanBeAccepted,
  assertOrderCanReceiveDeliveryOffer,
  getDeliveryTransitionTarget,
  getDeliveryOfferExpiry,
  getDriverAvailability,
} from "../model";
import { createDeliveryProof, verifyDeliveryProofCode } from "./proof";
import {
  type RestaurantDeliveryActor,
} from "../contracts";
import {
  persistDeliveryEvent,
} from "./persistence";

export interface DriverWorkflowActor {
  driverId: string;
  restaurantId: string;
}

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 4; depth += 1) {
    if (typeof current !== "object" || current === null) return false;
    if ("code" in current && current.code === "23505") return true;
    current = "cause" in current ? current.cause : null;
  }
  return false;
}

async function expireOffers(
  tx: Parameters<Parameters<typeof transactionalDb.transaction>[0]>[0],
  input: { driverId?: string; deliveryId?: string; now: Date },
) {
  const scope = [
    ...(input.driverId ? [eq(deliveryOffers.driverId, input.driverId)] : []),
    ...(input.deliveryId ? [eq(deliveryOffers.deliveryId, input.deliveryId)] : []),
  ];
  if (scope.length === 0) return;
  const expired = await tx
    .update(deliveryOffers)
    .set({ status: "expired", respondedAt: input.now, updatedAt: input.now })
    .where(
      and(
        eq(deliveryOffers.status, "pending"),
        lte(deliveryOffers.expiresAt, input.now),
        scope.length === 1 ? scope[0] : or(...scope),
      ),
    )
    .returning({
      id: deliveryOffers.id,
      deliveryId: deliveryOffers.deliveryId,
      orderId: deliveryOffers.orderId,
      restaurantId: deliveryOffers.restaurantId,
      driverId: deliveryOffers.driverId,
    });
  for (const offer of expired) {
    await persistDeliveryEvent(tx, {
      deliveryId: offer.deliveryId,
      orderId: offer.orderId,
      restaurantId: offer.restaurantId,
      driverId: offer.driverId,
      offerId: offer.id,
      eventType: "offer_expired",
      actorType: "system",
      actorId: "system",
      now: input.now,
    });
  }
}

export async function setDriverAvailabilityPersistence(input: {
  actor: DriverWorkflowActor;
  available: boolean;
  now: Date;
}) {
  return transactionalDb.transaction(async (tx) => {
    const driver = await tx.query.livreurs.findFirst({
      where: and(
        eq(livreurs.id, input.actor.driverId),
        eq(livreurs.restaurantId, input.actor.restaurantId),
      ),
      columns: {
        id: true,
        actif: true,
        passwordHash: true,
        mustChangePassword: true,
        enLigne: true,
      },
    });
    if (!driver?.actif || !driver.passwordHash || driver.mustChangePassword) {
      throw new DeliveryDomainError(
        "DRIVER_NOT_ACTIVE",
        "Ce compte livreur n'est pas activé.",
      );
    }

    await expireOffers(tx, { driverId: driver.id, now: input.now });
    if (!input.available) {
      const declinedOffers = await tx
        .update(deliveryOffers)
        .set({
          status: "declined",
          declineReason: "unavailable",
          becomeUnavailable: true,
          respondedAt: input.now,
          updatedAt: input.now,
        })
        .where(
          and(
            eq(deliveryOffers.driverId, driver.id),
            eq(deliveryOffers.status, "pending"),
            gt(deliveryOffers.expiresAt, input.now),
          ),
        )
        .returning({
          id: deliveryOffers.id,
          deliveryId: deliveryOffers.deliveryId,
          orderId: deliveryOffers.orderId,
        });
      for (const offer of declinedOffers) {
        await persistDeliveryEvent(tx, {
          deliveryId: offer.deliveryId,
          orderId: offer.orderId,
          restaurantId: input.actor.restaurantId,
          driverId: driver.id,
          offerId: offer.id,
          eventType: "offer_declined",
          actorType: "driver",
          actorId: driver.id,
          metadata: { reason: "unavailable", automatic: true },
          now: input.now,
        });
      }
    }

    await tx
      .update(livreurs)
      .set({ enLigne: input.available, lastSeenAt: input.now, updatedAt: input.now })
      .where(eq(livreurs.id, driver.id));
    if (driver.enLigne !== input.available) {
      await persistDeliveryEvent(tx, {
        restaurantId: input.actor.restaurantId,
        driverId: driver.id,
        eventType: "driver_availability_changed",
        actorType: "driver",
        actorId: driver.id,
        metadata: { available: input.available },
        now: input.now,
      });
    }
    return { available: input.available };
  });
}

export async function proposeDeliveryPersistence(input: {
  actor: RestaurantDeliveryActor;
  orderId: string;
  driverId: string;
  now: Date;
}) {
  try {
    const result = await transactionalDb.transaction(async (tx) => {
    const order = await tx.query.commandes.findFirst({
      where: and(
        eq(commandes.id, input.orderId),
        eq(commandes.restaurantId, input.actor.restaurantId),
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
    if (!order || order.modeCommande !== "livraison") {
      throw new DeliveryDomainError(
        "ORDER_NOT_DELIVERABLE",
        "Cette commande n'est pas livrable.",
      );
    }
    assertOrderCanReceiveDeliveryOffer(order.statut);
    if (
      !order.adresseLivraison ||
      order.latitudeLivraison === null ||
      order.longitudeLivraison === null
    ) {
      throw new DeliveryDomainError(
        "ORDER_NOT_DELIVERABLE",
        "Les coordonnées de livraison sont incomplètes.",
      );
    }

    const driver = await tx.query.livreurs.findFirst({
      where: and(
        eq(livreurs.id, input.driverId),
        eq(livreurs.restaurantId, input.actor.restaurantId),
      ),
      columns: {
        id: true,
        actif: true,
        enLigne: true,
        passwordHash: true,
        mustChangePassword: true,
        fixedDeliveryCompensationFcfa: true,
      },
    });
    if (!driver) {
      throw new DeliveryDomainError("DRIVER_NOT_FOUND", "Livreur introuvable.");
    }

    let delivery = await tx.query.livraisons.findFirst({
      where: eq(livraisons.commandeId, order.id),
      columns: { id: true, statut: true },
    });
    if (delivery && delivery.statut !== "en_attente" && delivery.statut !== "echouee") {
      throw new DeliveryDomainError(
        "DELIVERY_NOT_ASSIGNABLE",
        "Cette livraison est déjà assignée ou terminée.",
      );
    }

    await expireOffers(tx, {
      driverId: driver.id,
      deliveryId: delivery?.id,
      now: input.now,
    });
    const [activeDelivery, pendingOffer] = await Promise.all([
      tx.query.livraisons.findFirst({
        where: and(
          eq(livraisons.livreurId, driver.id),
          inArray(livraisons.statut, ["assignee", "en_route"]),
        ),
        columns: { id: true },
      }),
      tx.query.deliveryOffers.findFirst({
        where: and(
          eq(deliveryOffers.driverId, driver.id),
          eq(deliveryOffers.status, "pending"),
          gt(deliveryOffers.expiresAt, input.now),
        ),
        columns: { id: true },
      }),
    ]);
    const availability = getDriverAvailability({
      active: driver.actif,
      credentialsReady: Boolean(driver.passwordHash) && !driver.mustChangePassword,
      declaredAvailable: driver.enLigne,
      hasActiveDelivery: Boolean(activeDelivery),
      hasPendingOffer: Boolean(pendingOffer),
    });
    if (availability !== "available") {
      const code =
        availability === "busy"
          ? "DRIVER_BUSY"
          : availability === "access_pending"
            ? "DRIVER_ACCESS_PENDING"
            : availability === "disabled"
              ? "DRIVER_NOT_ACTIVE"
              : availability === "requested"
                ? "DRIVER_ALREADY_REQUESTED"
                : "DRIVER_UNAVAILABLE";
      throw new DeliveryDomainError(code, `Livreur non assignable : ${availability}.`);
    }

    const deliveryId = delivery?.id ?? crypto.randomUUID();
    const proof = createDeliveryProof(deliveryId);
    if (!delivery) {
      const [created] = await tx
        .insert(livraisons)
        .values({
          id: deliveryId,
          commandeId: order.id,
          statut: "en_attente",
          adresse: order.adresseLivraison,
          latitude: order.latitudeLivraison,
          longitude: order.longitudeLivraison,
          distanceKm: order.distanceKm,
          proofCodeDigest: proof.digest,
          proofCodeNonce: proof.nonce,
          proofCodeIssuedAt: input.now,
          createdAt: input.now,
          updatedAt: input.now,
        })
        .returning({ id: livraisons.id, statut: livraisons.statut });
      delivery = created;
    } else {
      await tx
        .update(livraisons)
        .set({
          proofCodeDigest: proof.digest,
          proofCodeNonce: proof.nonce,
          proofCodeIssuedAt: input.now,
          proofVerifiedAt: null,
          proofMethod: null,
          proofVerifiedByClientId: null,
          proofAttempts: 0,
          updatedAt: input.now,
        })
        .where(eq(livraisons.id, delivery.id));
    }
    if (!delivery) throw new Error("Création de la livraison impossible.");

    const [offer] = await tx
      .insert(deliveryOffers)
      .values({
        id: crypto.randomUUID(),
        deliveryId: delivery.id,
        orderId: order.id,
        restaurantId: input.actor.restaurantId,
        driverId: driver.id,
        status: "pending",
        driverCompensationAmountFcfa:
          driver.fixedDeliveryCompensationFcfa,
        createdByUserId: input.actor.userId,
        expiresAt: getDeliveryOfferExpiry(input.now),
        createdAt: input.now,
        updatedAt: input.now,
      })
      .returning({
        id: deliveryOffers.id,
        deliveryId: deliveryOffers.deliveryId,
        expiresAt: deliveryOffers.expiresAt,
      });
    if (!offer) throw new Error("Création de la proposition impossible.");
    await persistDeliveryEvent(tx, {
      deliveryId: delivery.id,
      orderId: order.id,
      restaurantId: input.actor.restaurantId,
      driverId: driver.id,
      offerId: offer.id,
      eventType: "delivery_proof_issued",
      actorType: "system",
      actorId: "system",
      now: input.now,
    });
    await persistDeliveryEvent(tx, {
      deliveryId: delivery.id,
      orderId: order.id,
      restaurantId: input.actor.restaurantId,
      driverId: driver.id,
      offerId: offer.id,
      eventType: "offer_created",
      actorType: "restaurant",
      actorId: input.actor.userId,
      fromStatus: delivery.statut,
      toStatus: delivery.statut,
      metadata: {
        expiresAt: offer.expiresAt.toISOString(),
        compensationAmountFcfa:
          driver.fixedDeliveryCompensationFcfa,
        currency: "XOF",
      },
      now: input.now,
    });
    await persistNotification(tx, {
      driverId: driver.id,
      type: "delivery_offer_received",
      titre: "Nouvelle proposition de livraison",
      message: `La commande #${order.numero} vous est proposée pendant cinq minutes.`,
      lienType: "livraison",
      lienId: delivery.id,
    });
    return {
      id: offer.id,
      deliveryId: offer.deliveryId,
      orderNumber: order.numero,
      expiresAt: offer.expiresAt,
    };
  });
    scheduleDriverNotification({
      driverId: input.driverId,
      type: "delivery_offer_received",
      titre: "Nouvelle proposition de livraison",
      message: `La commande #${result.orderNumber} vous est proposée pendant cinq minutes.`,
      lienType: "livraison",
      lienId: result.deliveryId,
      data: {
        offerId: result.id,
        expiresAt: result.expiresAt.toISOString(),
      },
    });
    return result;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new DeliveryDomainError(
        "DRIVER_ALREADY_REQUESTED",
        "Le livreur ou la livraison a déjà une proposition en attente.",
      );
    }
    throw error;
  }
}

export async function respondToOfferPersistence(input: {
  actor: DriverWorkflowActor;
  offerId: string;
  command: RespondToDeliveryOfferCommand;
  now: Date;
}) {
  const result = await transactionalDb.transaction(async (tx) => {
    const [offer] = await tx
      .select({
        id: deliveryOffers.id,
        deliveryId: deliveryOffers.deliveryId,
        orderId: deliveryOffers.orderId,
        restaurantId: deliveryOffers.restaurantId,
        driverId: deliveryOffers.driverId,
        status: deliveryOffers.status,
        expiresAt: deliveryOffers.expiresAt,
        createdByUserId: deliveryOffers.createdByUserId,
        compensationAmountFcfa:
          deliveryOffers.driverCompensationAmountFcfa,
      })
      .from(deliveryOffers)
      .where(
        and(
          eq(deliveryOffers.id, input.offerId),
          eq(deliveryOffers.driverId, input.actor.driverId),
          eq(deliveryOffers.restaurantId, input.actor.restaurantId),
        ),
      )
      .for("update");
    if (!offer) {
      throw new DeliveryDomainError("OFFER_NOT_FOUND", "Proposition introuvable.");
    }
    if (offer.status !== "pending") {
      throw new DeliveryDomainError(
        "OFFER_NOT_PENDING",
        "Cette proposition a déjà été traitée.",
      );
    }
    if (offer.expiresAt.getTime() <= input.now.getTime()) {
      await tx
        .update(deliveryOffers)
        .set({ status: "expired", respondedAt: input.now, updatedAt: input.now })
        .where(
          and(
            eq(deliveryOffers.id, offer.id),
            eq(deliveryOffers.status, "pending"),
          ),
        );
      await persistDeliveryEvent(tx, {
        deliveryId: offer.deliveryId,
        orderId: offer.orderId,
        restaurantId: offer.restaurantId,
        driverId: offer.driverId,
        offerId: offer.id,
        eventType: "offer_expired",
        actorType: "system",
        actorId: "system",
        now: input.now,
      });
      return { expired: true as const };
    }

    if (!input.command.accept) {
      await tx
        .update(deliveryOffers)
        .set({
          status: "declined",
          declineReason: input.command.declineReason,
          declineNote: input.command.note,
          becomeUnavailable: input.command.becomeUnavailable,
          respondedAt: input.now,
          updatedAt: input.now,
        })
        .where(eq(deliveryOffers.id, offer.id));
      if (input.command.becomeUnavailable) {
        await tx
          .update(livreurs)
          .set({ enLigne: false, updatedAt: input.now })
          .where(eq(livreurs.id, offer.driverId));
      }
      await persistDeliveryEvent(tx, {
        deliveryId: offer.deliveryId,
        orderId: offer.orderId,
        restaurantId: offer.restaurantId,
        driverId: offer.driverId,
        offerId: offer.id,
        eventType: "offer_declined",
        actorType: "driver",
        actorId: offer.driverId,
        metadata: {
          reason: input.command.declineReason,
          becomeUnavailable: input.command.becomeUnavailable,
        },
        now: input.now,
      });
      await persistNotification(tx, {
        userId: offer.createdByUserId,
        type: "delivery_offer_declined",
        titre: "Proposition refusée",
        message: "Le livreur a refusé la proposition. Vous pouvez choisir un autre livreur.",
        lienType: "commande",
        lienId: offer.orderId,
      });
      return { expired: false as const, accepted: false as const };
    }

    const [delivery, driver, activeDelivery] = await Promise.all([
      tx.query.livraisons.findFirst({
        where: eq(livraisons.id, offer.deliveryId),
        columns: { id: true, statut: true },
      }),
      tx.query.livreurs.findFirst({
        where: eq(livreurs.id, offer.driverId),
        columns: {
          actif: true,
          enLigne: true,
          passwordHash: true,
          mustChangePassword: true,
        },
      }),
      tx.query.livraisons.findFirst({
        where: and(
          eq(livraisons.livreurId, offer.driverId),
          inArray(livraisons.statut, ["assignee", "en_route"]),
          ne(livraisons.id, offer.deliveryId),
        ),
        columns: { id: true },
      }),
    ]);
    if (!delivery || !driver) {
      throw new DeliveryDomainError(
        "DELIVERY_NOT_FOUND",
        "Livraison ou livreur introuvable.",
      );
    }
    assertOfferCanBeAccepted({
      offerStatus: offer.status,
      expiresAt: offer.expiresAt,
      now: input.now,
      driver: {
        active: driver.actif,
        credentialsReady: Boolean(driver.passwordHash) && !driver.mustChangePassword,
        declaredAvailable: driver.enLigne,
        hasActiveDelivery: Boolean(activeDelivery),
        hasPendingOffer: false,
      },
      deliveryStatus: delivery.statut,
    });
    const [updatedDelivery] = await tx
      .update(livraisons)
      .set({
        livreurId: offer.driverId,
        statut: "assignee",
        heureAssignee: input.now,
        heureDepart: null,
        heureLivree: null,
        failureReason: null,
        failureNote: null,
        failedAt: null,
        cancelledAt: null,
        driverCompensationAmountFcfa: offer.compensationAmountFcfa,
        driverCompensationPaidAt: null,
        driverCompensationPaidByUserId: null,
        driverCompensationPaymentNote: null,
        updatedAt: input.now,
      })
      .where(
        and(
          eq(livraisons.id, delivery.id),
          inArray(livraisons.statut, ["en_attente", "echouee"]),
        ),
      )
      .returning({ id: livraisons.id });
    if (!updatedDelivery) {
      throw new DeliveryDomainError(
        "DELIVERY_NOT_ASSIGNABLE",
        "Cette livraison vient d'être assignée ailleurs.",
      );
    }
    await tx
      .update(deliveryOffers)
      .set({ status: "accepted", respondedAt: input.now, updatedAt: input.now })
      .where(
        and(
          eq(deliveryOffers.id, offer.id),
          eq(deliveryOffers.status, "pending"),
        ),
      );
    await persistDeliveryEvent(tx, {
      deliveryId: delivery.id,
      orderId: offer.orderId,
      restaurantId: offer.restaurantId,
      driverId: offer.driverId,
      offerId: offer.id,
      eventType: "offer_accepted",
      actorType: "driver",
      actorId: offer.driverId,
      fromStatus: delivery.statut,
      toStatus: "assignee",
      metadata: {
        compensationAmountFcfa: offer.compensationAmountFcfa,
        currency: "XOF",
      },
      now: input.now,
    });
    await persistDeliveryEvent(tx, {
      deliveryId: delivery.id,
      orderId: offer.orderId,
      restaurantId: offer.restaurantId,
      driverId: offer.driverId,
      offerId: offer.id,
      eventType:
        delivery.statut === "echouee" ? "delivery_reassigned" : "delivery_assigned",
      actorType: "driver",
      actorId: offer.driverId,
      fromStatus: delivery.statut,
      toStatus: "assignee",
      metadata: {
        compensationAmountFcfa: offer.compensationAmountFcfa,
        currency: "XOF",
      },
      now: input.now,
    });
    return {
      expired: false as const,
      accepted: true as const,
      deliveryId: delivery.id,
    };
  });
  if (result.expired) {
    throw new DeliveryDomainError("OFFER_EXPIRED", "Cette proposition a expiré.");
  }
  return result;
}

export async function unassignDeliveryPersistence(input: {
  actor: RestaurantDeliveryActor;
  deliveryId: string;
  now: Date;
}) {
  return transactionalDb.transaction(async (tx) => {
    const [delivery] = await tx
      .select({
        id: livraisons.id,
        orderId: livraisons.commandeId,
        driverId: livraisons.livreurId,
      })
      .from(livraisons)
      .innerJoin(commandes, eq(commandes.id, livraisons.commandeId))
      .where(
        and(
          eq(livraisons.id, input.deliveryId),
          eq(livraisons.statut, "assignee"),
          eq(commandes.restaurantId, input.actor.restaurantId),
        ),
      )
      .for("update");
    if (!delivery) {
      throw new DeliveryDomainError(
        "DELIVERY_NOT_REASSIGNABLE",
        "Seule une livraison acceptée mais non démarrée peut être réassignée.",
      );
    }
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
      driverId: delivery.driverId,
      eventType: "delivery_unassigned",
      actorType: "restaurant",
      actorId: input.actor.userId,
      fromStatus: "assignee",
      toStatus: "en_attente",
      now: input.now,
    });
    return { deliveryId: delivery.id };
  });
}

export async function cancelRestaurantDeliveryOrderPersistence(input: {
  actor: RestaurantDeliveryActor;
  orderId: string;
  now: Date;
}) {
  const result = await transactionalDb.transaction(async (tx) => {
    const order = await tx.query.commandes.findFirst({
      where: and(
        eq(commandes.id, input.orderId),
        eq(commandes.restaurantId, input.actor.restaurantId),
      ),
      columns: { id: true, modeCommande: true },
    });
    if (!order || order.modeCommande !== "livraison") {
      throw new DeliveryDomainError(
        "ORDER_NOT_DELIVERABLE",
        "Cette commande n'est pas une livraison du restaurant.",
      );
    }

    const [delivery] = await tx
      .select({
        id: livraisons.id,
        driverId: livraisons.livreurId,
        status: livraisons.statut,
      })
      .from(livraisons)
      .where(eq(livraisons.commandeId, order.id))
      .for("update");

    if (delivery) {
      getDeliveryTransitionTarget(delivery.status, "cancel");
      const cancelledOffers = await tx
        .update(deliveryOffers)
        .set({
          status: "cancelled",
          respondedAt: input.now,
          updatedAt: input.now,
        })
        .where(
          and(
            eq(deliveryOffers.deliveryId, delivery.id),
            eq(deliveryOffers.status, "pending"),
          ),
        )
        .returning({ id: deliveryOffers.id, driverId: deliveryOffers.driverId });
      for (const offer of cancelledOffers) {
        await persistDeliveryEvent(tx, {
          deliveryId: delivery.id,
          orderId: order.id,
          restaurantId: input.actor.restaurantId,
          driverId: offer.driverId,
          offerId: offer.id,
          eventType: "offer_cancelled",
          actorType: "restaurant",
          actorId: input.actor.userId,
          metadata: { reason: "order_cancelled" },
          now: input.now,
        });
      }
      const [updated] = await tx
        .update(livraisons)
        .set({ statut: "annulee", cancelledAt: input.now, updatedAt: input.now })
        .where(
          and(
            eq(livraisons.id, delivery.id),
            inArray(livraisons.statut, ["en_attente", "assignee", "echouee"]),
          ),
        )
        .returning({ id: livraisons.id });
      if (!updated) {
        throw new DeliveryDomainError(
          "DELIVERY_NOT_CANCELLABLE",
          "La livraison a déjà changé d'état.",
        );
      }
      await persistDeliveryEvent(tx, {
        deliveryId: delivery.id,
        orderId: order.id,
        restaurantId: input.actor.restaurantId,
        driverId: delivery.driverId,
        eventType: "delivery_cancelled",
        actorType: "restaurant",
        actorId: input.actor.userId,
        fromStatus: delivery.status,
        toStatus: "annulee",
        now: input.now,
      });
    }

    const orderTransition = await cancelDeliveryOrderInTransaction(tx, {
      orderId: order.id,
      restaurantId: input.actor.restaurantId,
      now: input.now,
    });
    return { deliveryId: delivery?.id ?? null, orderTransition };
  });
  await scheduleCancelledDeliveryOrderEffects(result.orderTransition);
  return result.orderTransition.commande;
}

export async function startDriverDeliveryPersistence(input: {
  actor: DriverWorkflowActor;
  deliveryId: string;
  now: Date;
}) {
  const result = await transactionalDb.transaction(async (tx) => {
    const [row] = await tx
      .select({
        id: livraisons.id,
        orderId: livraisons.commandeId,
        deliveryStatus: livraisons.statut,
        orderStatus: commandes.statut,
        orderNumber: commandes.numero,
        clientId: commandes.clientId,
      })
      .from(livraisons)
      .innerJoin(commandes, eq(commandes.id, livraisons.commandeId))
      .where(
        and(
          eq(livraisons.id, input.deliveryId),
          eq(livraisons.livreurId, input.actor.driverId),
          eq(commandes.restaurantId, input.actor.restaurantId),
        ),
      )
      .for("update");
    if (!row) {
      throw new DeliveryDomainError("DELIVERY_NOT_FOUND", "Livraison introuvable.");
    }
    assertDeliveryCanStart({
      deliveryStatus: row.deliveryStatus,
      orderStatus: row.orderStatus,
    });
    const [updated] = await tx
      .update(livraisons)
      .set({ statut: "en_route", heureDepart: input.now, updatedAt: input.now })
      .where(
        and(
          eq(livraisons.id, row.id),
          eq(livraisons.statut, "assignee"),
          eq(livraisons.livreurId, input.actor.driverId),
        ),
      )
      .returning({ id: livraisons.id });
    if (!updated) {
      throw new DeliveryDomainError(
        "DELIVERY_NOT_STARTABLE",
        "La livraison a déjà changé d'état.",
      );
    }
    await persistDeliveryEvent(tx, {
      deliveryId: row.id,
      orderId: row.orderId,
      restaurantId: input.actor.restaurantId,
      driverId: input.actor.driverId,
      eventType: "delivery_started",
      actorType: "driver",
      actorId: input.actor.driverId,
      fromStatus: "assignee",
      toStatus: "en_route",
      now: input.now,
    });
    if (row.clientId) {
      await persistNotification(tx, {
        clientId: row.clientId,
        type: "delivery_started",
        titre: "Votre commande est en route",
        message: `Le livreur a récupéré la commande #${row.orderNumber}.`,
        lienType: "commande",
        lienId: row.orderId,
      });
    }
    return {
      deliveryId: row.id,
      orderId: row.orderId,
      orderNumber: row.orderNumber,
      clientId: row.clientId,
    };
  });
  if (result.clientId) {
    scheduleClientNotification({
      clientId: result.clientId,
      type: "delivery_started",
      titre: "Votre commande est en route",
      message: `Le livreur a récupéré la commande #${result.orderNumber}.`,
      lienType: "commande",
      lienId: result.orderId,
    });
  }
  return { deliveryId: result.deliveryId, orderId: result.orderId };
}

export async function verifyDriverDeliveryCodePersistence(input: {
  actor: DriverWorkflowActor;
  deliveryId: string;
  code: string;
  now: Date;
}) {
  return transactionalDb.transaction(async (tx) => {
    const [row] = await tx
      .select({
        id: livraisons.id,
        orderId: livraisons.commandeId,
        digest: livraisons.proofCodeDigest,
        attempts: livraisons.proofAttempts,
        verifiedAt: livraisons.proofVerifiedAt,
      })
      .from(livraisons)
      .innerJoin(commandes, eq(commandes.id, livraisons.commandeId))
      .where(
        and(
          eq(livraisons.id, input.deliveryId),
          eq(livraisons.livreurId, input.actor.driverId),
          eq(livraisons.statut, "en_route"),
          eq(commandes.restaurantId, input.actor.restaurantId),
        ),
      )
      .for("update");
    if (!row || !row.digest) {
      throw new DeliveryDomainError(
        "DELIVERY_PROOF_REQUIRED",
        "Aucun code de remise actif n'est disponible.",
      );
    }
    if (row.verifiedAt) return { verified: true as const };
    if (row.attempts >= 10) {
      throw new DeliveryDomainError(
        "DELIVERY_PROOF_INVALID",
        "Trop de tentatives de code. Signalez un problème.",
      );
    }
    const verified = verifyDeliveryProofCode({
      deliveryId: row.id,
      code: input.code,
      expectedDigest: row.digest,
    });
    if (!verified) {
      await tx
        .update(livraisons)
        .set({ proofAttempts: sql`${livraisons.proofAttempts} + 1`, updatedAt: input.now })
        .where(eq(livraisons.id, row.id));
      return { verified: false as const };
    }
    await tx
      .update(livraisons)
      .set({
        proofVerifiedAt: input.now,
        proofMethod: "client_code",
        proofAttempts: sql`${livraisons.proofAttempts} + 1`,
        updatedAt: input.now,
      })
      .where(eq(livraisons.id, row.id));
    await persistDeliveryEvent(tx, {
      deliveryId: row.id,
      orderId: row.orderId,
      restaurantId: input.actor.restaurantId,
      driverId: input.actor.driverId,
      eventType: "delivery_proof_verified",
      actorType: "driver",
      actorId: input.actor.driverId,
      metadata: { method: "client_code" },
      now: input.now,
    });
    return { verified: true as const };
  });
}

export async function confirmClientDeliveryPersistence(input: {
  clientId: string;
  deliveryId: string;
  now: Date;
}) {
  return transactionalDb.transaction(async (tx) => {
    const [row] = await tx
      .select({
        id: livraisons.id,
        orderId: livraisons.commandeId,
        restaurantId: commandes.restaurantId,
        driverId: livraisons.livreurId,
        verifiedAt: livraisons.proofVerifiedAt,
      })
      .from(livraisons)
      .innerJoin(commandes, eq(commandes.id, livraisons.commandeId))
      .where(
        and(
          eq(livraisons.id, input.deliveryId),
          eq(livraisons.statut, "en_route"),
          eq(commandes.clientId, input.clientId),
        ),
      )
      .for("update");
    if (!row) {
      throw new DeliveryDomainError("DELIVERY_NOT_FOUND", "Livraison introuvable.");
    }
    if (row.verifiedAt) return { verified: true as const };
    await tx
      .update(livraisons)
      .set({
        proofVerifiedAt: input.now,
        proofMethod: "client_app",
        proofVerifiedByClientId: input.clientId,
        updatedAt: input.now,
      })
      .where(eq(livraisons.id, row.id));
    await persistDeliveryEvent(tx, {
      deliveryId: row.id,
      orderId: row.orderId,
      restaurantId: row.restaurantId,
      driverId: row.driverId,
      eventType: "delivery_proof_verified",
      actorType: "client",
      actorId: input.clientId,
      metadata: { method: "client_app" },
      now: input.now,
    });
    return { verified: true as const };
  });
}

export async function completeDriverDeliveryPersistence(input: {
  actor: DriverWorkflowActor;
  deliveryId: string;
  cashCollected: boolean;
  now: Date;
}) {
  const result = await transactionalDb.transaction(async (tx) => {
    const [row] = await tx
      .select({
        id: livraisons.id,
        orderId: livraisons.commandeId,
        deliveryStatus: livraisons.statut,
        proofVerifiedAt: livraisons.proofVerifiedAt,
        orderTotal: commandes.total,
      })
      .from(livraisons)
      .innerJoin(commandes, eq(commandes.id, livraisons.commandeId))
      .where(
        and(
          eq(livraisons.id, input.deliveryId),
          eq(livraisons.livreurId, input.actor.driverId),
          eq(commandes.restaurantId, input.actor.restaurantId),
        ),
      )
      .for("update");
    if (!row) {
      throw new DeliveryDomainError("DELIVERY_NOT_FOUND", "Livraison introuvable.");
    }
    const payment = await getRestaurantOrderPaymentSummaryInTransaction(
      tx,
      row.orderId,
    );
    if (!payment || payment.amountFcfa !== row.orderTotal) {
      throw new Error("Le paiement canonique de la commande est incohérent.");
    }
    const cashRequired = payment.method === "cash";
    assertDeliveryCanComplete({
      deliveryStatus: row.deliveryStatus,
      proofVerified: Boolean(row.proofVerifiedAt),
      cashRequired,
      cashCollected: input.cashCollected,
    });
    const [updated] = await tx
      .update(livraisons)
      .set({
        statut: "livree",
        heureLivree: input.now,
        ...(cashRequired
          ? {
              cashCollectedAt: input.now,
              cashCollectedAmountFcfa: row.orderTotal,
            }
          : {}),
        updatedAt: input.now,
      })
      .where(
        and(
          eq(livraisons.id, row.id),
          eq(livraisons.statut, "en_route"),
          eq(livraisons.livreurId, input.actor.driverId),
        ),
      )
      .returning({ id: livraisons.id });
    if (!updated) {
      throw new DeliveryDomainError(
        "DELIVERY_NOT_COMPLETABLE",
        "La livraison a déjà changé d'état.",
      );
    }
    if (cashRequired) {
      await tx.insert(driverCashCollections).values({
        id: crypto.randomUUID(),
        deliveryId: row.id,
        orderId: row.orderId,
        restaurantId: input.actor.restaurantId,
        driverId: input.actor.driverId,
        expectedAmountFcfa: row.orderTotal,
        collectedAmountFcfa: row.orderTotal,
        status: "held",
        collectedAt: input.now,
        createdAt: input.now,
      });
      await persistDeliveryEvent(tx, {
        deliveryId: row.id,
        orderId: row.orderId,
        restaurantId: input.actor.restaurantId,
        driverId: input.actor.driverId,
        eventType: "cash_collected",
        actorType: "driver",
        actorId: input.actor.driverId,
        metadata: { amountFcfa: row.orderTotal, currency: "XOF" },
        now: input.now,
      });
    }
    const orderTransition = await completeDeliveryOrderInTransaction(tx, {
      orderId: row.orderId,
      restaurantId: input.actor.restaurantId,
      now: input.now,
    });
    await tx
      .update(livreurs)
      .set({
        nombreLivraisons: sql`${livreurs.nombreLivraisons} + 1`,
        updatedAt: input.now,
      })
      .where(eq(livreurs.id, input.actor.driverId));
    await persistDeliveryEvent(tx, {
      deliveryId: row.id,
      orderId: row.orderId,
      restaurantId: input.actor.restaurantId,
      driverId: input.actor.driverId,
      eventType: "delivery_completed",
      actorType: "driver",
      actorId: input.actor.driverId,
      fromStatus: "en_route",
      toStatus: "livree",
      metadata: { cashCollected: cashRequired, amountFcfa: cashRequired ? row.orderTotal : null },
      now: input.now,
    });
    return { deliveryId: row.id, orderId: row.orderId, orderTransition };
  });
  await scheduleCompletedDeliveryOrderEffects(result.orderTransition);
  return { deliveryId: result.deliveryId, orderId: result.orderId };
}

export async function failDriverDeliveryPersistence(input: {
  actor: DriverWorkflowActor;
  command: FailDriverDeliveryCommand;
  now: Date;
}) {
  const result = await transactionalDb.transaction(async (tx) => {
    const [row] = await tx
      .select({
        id: livraisons.id,
        orderId: livraisons.commandeId,
        orderNumber: commandes.numero,
        clientId: commandes.clientId,
      })
      .from(livraisons)
      .innerJoin(commandes, eq(commandes.id, livraisons.commandeId))
      .where(
        and(
          eq(livraisons.id, input.command.deliveryId),
          eq(livraisons.livreurId, input.actor.driverId),
          eq(livraisons.statut, "en_route"),
          eq(commandes.restaurantId, input.actor.restaurantId),
        ),
      )
      .for("update");
    if (!row) {
      throw new DeliveryDomainError(
        "DELIVERY_NOT_FAILABLE",
        "Cette livraison ne peut pas être signalée en échec.",
      );
    }
    await tx
      .update(livraisons)
      .set({
        statut: "echouee",
        failureReason: input.command.reason,
        failureNote: input.command.note,
        failedAt: input.now,
        updatedAt: input.now,
      })
      .where(
        and(eq(livraisons.id, row.id), eq(livraisons.statut, "en_route")),
      );
    await persistDeliveryEvent(tx, {
      deliveryId: row.id,
      orderId: row.orderId,
      restaurantId: input.actor.restaurantId,
      driverId: input.actor.driverId,
      eventType: "delivery_failed",
      actorType: "driver",
      actorId: input.actor.driverId,
      fromStatus: "en_route",
      toStatus: "echouee",
      metadata: { reason: input.command.reason, note: input.command.note ?? null },
      now: input.now,
    });
    if (row.clientId) {
      await persistNotification(tx, {
        clientId: row.clientId,
        type: "delivery_failed",
        titre: "Problème pendant la livraison",
        message: `La commande #${row.orderNumber} n'a pas pu être remise. Le restaurant peut organiser la suite.`,
        lienType: "commande",
        lienId: row.orderId,
      });
    }
    return {
      deliveryId: row.id,
      orderId: row.orderId,
      orderNumber: row.orderNumber,
      clientId: row.clientId,
    };
  });
  if (result.clientId) {
    scheduleClientNotification({
      clientId: result.clientId,
      type: "delivery_failed",
      titre: "Problème pendant la livraison",
      message: `La commande #${result.orderNumber} n'a pas pu être remise. Le restaurant peut organiser la suite.`,
      lienType: "commande",
      lienId: result.orderId,
    });
  }
  return { deliveryId: result.deliveryId, orderId: result.orderId };
}

export async function confirmDriverCashRemittancePersistence(input: {
  actor: RestaurantDeliveryActor;
  command: ConfirmDriverCashRemittanceCommand;
  now: Date;
}) {
  const result = await transactionalDb.transaction(async (tx) => {
    const uniqueIds = [...new Set(input.command.deliveryIds)];
    if (uniqueIds.length !== input.command.deliveryIds.length) {
      throw new DeliveryDomainError(
        "CASH_REMITTANCE_INVALID",
        "Une livraison ne peut apparaître qu'une fois dans la remise.",
      );
    }
    const rows = await tx
      .select({
        id: driverCashCollections.id,
        deliveryId: driverCashCollections.deliveryId,
        orderId: driverCashCollections.orderId,
        amount: driverCashCollections.collectedAmountFcfa,
      })
      .from(driverCashCollections)
      .where(
        and(
          inArray(driverCashCollections.deliveryId, uniqueIds),
          eq(driverCashCollections.driverId, input.command.driverId),
          eq(driverCashCollections.restaurantId, input.actor.restaurantId),
          eq(driverCashCollections.status, "held"),
        ),
      )
      .for("update");
    if (rows.length !== uniqueIds.length) {
      throw new DeliveryDomainError(
        "CASH_REMITTANCE_INVALID",
        "Une ou plusieurs collectes sont introuvables ou déjà remises.",
      );
    }
    const total = rows.reduce((sum, row) => sum + row.amount, 0);
    const remittanceId = crypto.randomUUID();
    await tx.insert(driverCashRemittances).values({
      id: remittanceId,
      restaurantId: input.actor.restaurantId,
      driverId: input.command.driverId,
      expectedAmountFcfa: total,
      receivedAmountFcfa: total,
      confirmedByUserId: input.actor.userId,
      note: input.command.note,
      confirmedAt: input.now,
      createdAt: input.now,
    });
    await tx
      .update(driverCashCollections)
      .set({ status: "remitted", remittanceId, remittedAt: input.now })
      .where(inArray(driverCashCollections.id, rows.map((row) => row.id)));
    for (const row of rows) {
      await persistDeliveryEvent(tx, {
        deliveryId: row.deliveryId,
        orderId: row.orderId,
        restaurantId: input.actor.restaurantId,
        driverId: input.command.driverId,
        eventType: "cash_remitted",
        actorType: "restaurant",
        actorId: input.actor.userId,
        metadata: { remittanceId, amountFcfa: row.amount, currency: "XOF" },
        now: input.now,
      });
    }
    await persistNotification(tx, {
      driverId: input.command.driverId,
      type: "cash_remittance_confirmed",
      titre: "Remise d'espèces confirmée",
      message: `${total.toLocaleString("fr-FR")} FCFA remis au restaurant pour ${rows.length} livraison${rows.length > 1 ? "s" : ""}.`,
      lienType: "remise_especes",
      lienId: remittanceId,
    });
    return { remittanceId, amountFcfa: total, deliveryCount: rows.length };
  });
  scheduleDriverNotification({
    driverId: input.command.driverId,
    type: "cash_remittance_confirmed",
    titre: "Remise d'espèces confirmée",
    message: `${result.amountFcfa.toLocaleString("fr-FR")} FCFA remis au restaurant pour ${result.deliveryCount} livraison${result.deliveryCount > 1 ? "s" : ""}.`,
    lienType: "remise_especes",
    lienId: result.remittanceId,
  });
  return result;
}

export async function confirmDriverCompensationPaymentPersistence(input: {
  actor: RestaurantDeliveryActor;
  command: ConfirmDriverCompensationPaymentCommand;
  now: Date;
}) {
  const result = await transactionalDb.transaction(async (tx) => {
    const rows = await tx
      .select({
        deliveryId: livraisons.id,
        orderId: livraisons.commandeId,
        amountFcfa: livraisons.driverCompensationAmountFcfa,
      })
      .from(livraisons)
      .innerJoin(commandes, eq(commandes.id, livraisons.commandeId))
      .where(
        and(
          eq(livraisons.livreurId, input.command.driverId),
          eq(commandes.restaurantId, input.actor.restaurantId),
          eq(livraisons.statut, "livree"),
          isNotNull(livraisons.driverCompensationAmountFcfa),
          isNull(livraisons.driverCompensationPaidAt),
        ),
      )
      .for("update");
    if (rows.length === 0) {
      throw new DeliveryDomainError(
        "DRIVER_COMPENSATION_PAYMENT_INVALID",
        "Aucune rémunération de livraison n'est actuellement à régler.",
      );
    }

    const deliveryIds = rows.map((row) => row.deliveryId);
    const total = rows.reduce(
      (sum, row) => sum + (row.amountFcfa ?? 0),
      0,
    );
    const paymentReference = crypto.randomUUID();
    const paid = await tx
      .update(livraisons)
      .set({
        driverCompensationPaidAt: input.now,
        driverCompensationPaidByUserId: input.actor.userId,
        driverCompensationPaymentNote: input.command.note ?? null,
        updatedAt: input.now,
      })
      .where(
        and(
          inArray(livraisons.id, deliveryIds),
          eq(livraisons.statut, "livree"),
          isNull(livraisons.driverCompensationPaidAt),
        ),
      )
      .returning({ id: livraisons.id });
    if (paid.length !== rows.length) {
      throw new DeliveryDomainError(
        "DRIVER_COMPENSATION_PAYMENT_INVALID",
        "Une rémunération vient déjà d'être déclarée réglée.",
      );
    }

    for (const row of rows) {
      await persistDeliveryEvent(tx, {
        deliveryId: row.deliveryId,
        orderId: row.orderId,
        restaurantId: input.actor.restaurantId,
        driverId: input.command.driverId,
        eventType: "driver_compensation_paid",
        actorType: "restaurant",
        actorId: input.actor.userId,
        metadata: {
          paymentReference,
          amountFcfa: row.amountFcfa,
          currency: "XOF",
          note: input.command.note ?? null,
        },
        now: input.now,
      });
    }
    await persistNotification(tx, {
      driverId: input.command.driverId,
      type: "systeme",
      titre: "Rémunération déclarée réglée",
      message: `${total.toLocaleString("fr-FR")} FCFA déclarés réglés par le restaurant pour ${rows.length} livraison${rows.length > 1 ? "s" : ""}.`,
      lienType: "livraison",
      lienId: rows[0]!.deliveryId,
    });
    return {
      paymentReference,
      amountFcfa: total,
      deliveryCount: rows.length,
      firstDeliveryId: rows[0]!.deliveryId,
    };
  });

  scheduleDriverNotification({
    driverId: input.command.driverId,
    type: "systeme",
    titre: "Rémunération déclarée réglée",
    message: `${result.amountFcfa.toLocaleString("fr-FR")} FCFA déclarés réglés par le restaurant pour ${result.deliveryCount} livraison${result.deliveryCount > 1 ? "s" : ""}.`,
    lienType: "livraison",
    lienId: result.firstDeliveryId,
  });
  return {
    paymentReference: result.paymentReference,
    amountFcfa: result.amountFcfa,
    deliveryCount: result.deliveryCount,
  };
}
