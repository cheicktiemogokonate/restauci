import { after } from "next/server";
import { and, eq, inArray, ne } from "drizzle-orm";
import { invalidateRestaurantCache } from "@/infrastructure/cache";
import { redis } from "@/infrastructure/cache/redis";
import { transactionalDb, type TransactionExecutor } from "@/infrastructure/db";
import {
  scheduleDebtCycleNotification,
  transitionCommissionForOrder,
  releaseOrderRecoveryReservationsInTransaction,
} from "@/modules/commissions/server";
import {
  sendClientNotification,
  sendNotification,
} from "@/modules/notifications/server";
import { pushSseEvent } from "@/infrastructure/realtime/sse-push";
import {
  assertRestaurantOrderActorCanTransition,
  RESTAURANT_ORDER_PREVIOUS_STATUSES,
} from "../model";
import type {
  RestaurantOrderActor,
  TransitionRestaurantOrderCommand,
} from "../contracts";
import { commandes } from "@/infrastructure/db/schema";
import { getRestaurantOrderContext } from "@/modules/restaurants/server";
import {
  cancelRestaurantOrderTransactionInTransaction,
  confirmRestaurantOrderCashInTransaction,
} from "@/modules/transactions/server";

async function getUserIdFromRestaurant(restaurantId: string): Promise<string> {
  const restaurant = await getRestaurantOrderContext(restaurantId);
  if (!restaurant) throw new Error("Restaurant introuvable");
  return restaurant.notificationUserId;
}

/**
 * Unique write path for commandes.statut. Authorization remains in each
 * controller; ownership and allowed prior states are rechecked atomically.
 */
export async function applyRestaurantOrderTransition(
  tx: TransactionExecutor,
  actor: RestaurantOrderActor,
  command: TransitionRestaurantOrderCommand,
) {
  if (
    (actor.type === "restaurant" && !actor.restaurantId) ||
    (actor.type === "client" && !actor.clientId) ||
    (actor.type === "delivery" && !actor.restaurantId)
  ) {
    throw new Error("Périmètre acteur commande incomplet");
  }
  if (actor.type === "delivery" && !command.allowDeliveryCompletion) {
    throw new Error("Une transition Delivery doit être explicitement autorisée");
  }
  const statut = command.targetStatus;
  assertRestaurantOrderActorCanTransition(actor.type, statut);
  const canonicalPreviousStatuses = RESTAURANT_ORDER_PREVIOUS_STATUSES[statut];
  const previousStatuses =
    command.allowedPreviousStatuses ?? canonicalPreviousStatuses;
  if (previousStatuses.length === 0) return undefined;
  if (
    previousStatuses.some(
      (previousStatus) => !canonicalPreviousStatuses.includes(previousStatus),
    )
  ) {
    throw new Error("États précédents incompatibles avec la machine de commande");
  }

  const now = command.now ?? new Date();
  const timestampFields: Partial<{ heureAcceptee: Date; heurePrete: Date; heureServie: Date }> = {};
  if (statut === "en_preparation") timestampFields.heureAcceptee = now;
  if (statut === "prete") timestampFields.heurePrete = now;
  if (statut === "servie") timestampFields.heureServie = now;

  const [commande] = await tx.update(commandes).set({ statut, ...timestampFields, updatedAt: now })
      .where(and(
        eq(commandes.id, command.orderId),
        ...(actor.restaurantId
          ? [eq(commandes.restaurantId, actor.restaurantId)]
          : []),
        ...(actor.clientId ? [eq(commandes.clientId, actor.clientId)] : []),
        inArray(commandes.statut, previousStatuses),
        ...(statut === "servie" && !command.allowDeliveryCompletion
          ? [ne(commandes.modeCommande, "livraison")]
          : []),
      )).returning();
  if (!commande) return undefined;
  const paymentTransition = statut === "servie"
    ? await confirmRestaurantOrderCashInTransaction(tx, command.orderId, now)
    : statut === "annulee"
      ? await cancelRestaurantOrderTransactionInTransaction(tx, command.orderId, now)
      : null;
  const transition = statut === "servie" || statut === "annulee"
    ? await transitionCommissionForOrder(tx, command.orderId, statut, now)
    : null;
  if (statut === "annulee") {
    await releaseOrderRecoveryReservationsInTransaction(tx, command.orderId, now);
  }
  return { commande, transition, paymentTransition };
}

export async function scheduleRestaurantOrderTransitionEffects(
  result: NonNullable<Awaited<ReturnType<typeof applyRestaurantOrderTransition>>>,
) {
  const commande = result?.commande;
  const { id, restaurantId, statut } = commande;

  after(async () => {
    const queueKeyClient = `restauci:sse:client:queue:${id}`;
    const notification = statut === "prete" || statut === "annulee"
      ? sendNotification({
          userId: await getUserIdFromRestaurant(restaurantId),
          restaurantId,
          type: statut === "annulee" ? "commande_annulee" : "commande_prete",
          titre: statut === "annulee" ? "Commande annulée" : "Commande prête",
          message: `La commande #${commande.numero} est maintenant ${statut.replace("_", " ")}.`,
          lienType: "commande",
          lienId: id,
          data: { statut, numero: commande.numero, total: commande.total },
        })
      : Promise.resolve();
    const clientNotification = commande.clientId
      ? sendClientNotification({
          clientId: commande.clientId,
          type:
            statut === "prete"
              ? "commande_prete"
              : statut === "annulee"
                ? "commande_annulee"
                : "systeme",
          titre:
            statut === "en_preparation"
              ? "Commande en préparation"
              : statut === "prete"
                ? "Commande prête"
                : statut === "servie"
                  ? "Commande terminée"
                  : "Commande annulée",
          message: `La commande #${commande.numero} est maintenant ${statut.replace("_", " ")}.`,
          lienType: "commande",
          lienId: id,
          data: { statut, numero: commande.numero, total: commande.total },
        })
      : Promise.resolve();
    const results = await Promise.allSettled([
      pushSseEvent(restaurantId, "statut", {
        statut, commandeId: id, lienId: id, numero: commande.numero,
        total: commande.total, timestamp: new Date().toISOString(),
      }),
      notification,
      clientNotification,
      (async () => {
        await redis.rpush(queueKeyClient, JSON.stringify({
          type: "statut",
          data: { statut, commandeId: id, timestamp: new Date().toISOString() },
        }));
        await redis.expire(queueKeyClient, 300);
      })(),
      invalidateRestaurantCache(restaurantId),
    ]);
    results.forEach((result) => {
      if (result.status === "rejected") console.error("[updateStatutCommande] Effet secondaire en échec:", result.reason);
    });
  });
  if (
    result.transition?.cycleResult?.notificationNeeded &&
    result.transition.cycleResult.cycle
  ) {
    scheduleDebtCycleNotification({
      partnerAccountId: result.transition.commission.partnerAccountId,
      cycleId: result.transition.cycleResult.cycle.id,
      debtFcfa: result.transition.cycleResult.debt,
    });
  }
}

export async function transitionRestaurantOrder(
  actor: RestaurantOrderActor,
  command: TransitionRestaurantOrderCommand,
) {
  const result = await transactionalDb.transaction((tx) =>
    applyRestaurantOrderTransition(tx, actor, command),
  );
  if (!result) return undefined;
  await scheduleRestaurantOrderTransitionEffects(result);
  return result.commande;
}
