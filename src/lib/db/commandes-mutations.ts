import { after } from "next/server";
import { and, eq, inArray, ne } from "drizzle-orm";
import { invalidateRestaurantCache } from "@/lib/cache";
import { redis } from "@/lib/cache/redis";
import { db } from "@/lib/db";
import { transactionalDb } from "@/lib/db/transaction";
import {
  scheduleDebtCycleNotification,
  transitionCommissionForOrder,
  releaseOrderRecoveryReservationsInTransaction,
} from "@/lib/commissions/ledger";
import {
  sendClientNotification,
  sendNotification,
} from "@/lib/notifications";
import { pushSseEvent } from "@/lib/realtime/sse-push";
import { STATUT_PREVIOUS_STATUSES } from "@/types/commandes";
import type { StatutCommande } from "./types";
import { commandes } from "./schema";
import type { TransactionExecutor } from "./transaction";
import {
  cancelRestaurantOrderTransactionInTransaction,
  confirmRestaurantOrderCashInTransaction,
} from "@/modules/transactions/server";

export interface RestaurantOrderTransitionInput {
  id: string;
  targetStatus: StatutCommande;
  restaurantId?: string;
  clientId?: string;
  allowedPreviousStatuses?: StatutCommande[];
  allowDeliveryCompletion?: boolean;
  now?: Date;
}

async function getUserIdFromRestaurant(restaurantId: string): Promise<string> {
  const restaurant = await db.query.restaurants.findFirst({
    where: (restaurant, { eq }) => eq(restaurant.id, restaurantId),
    columns: { id: true },
    with: { partnerAccount: { columns: { userId: true } } },
  });
  if (!restaurant) throw new Error("Restaurant introuvable");
  return restaurant.partnerAccount.userId;
}

/**
 * Unique write path for commandes.statut. Authorization remains in each
 * controller; ownership and allowed prior states are rechecked atomically.
 */
export async function applyRestaurantOrderTransition(
  tx: TransactionExecutor,
  input: RestaurantOrderTransitionInput,
) {
  const statut = input.targetStatus;
  const canonicalPreviousStatuses = STATUT_PREVIOUS_STATUSES[statut];
  const previousStatuses =
    input.allowedPreviousStatuses ?? canonicalPreviousStatuses;
  if (previousStatuses.length === 0) return undefined;
  if (
    previousStatuses.some(
      (previousStatus) => !canonicalPreviousStatuses.includes(previousStatus),
    )
  ) {
    throw new Error("États précédents incompatibles avec la machine de commande");
  }

  const now = input.now ?? new Date();
  const timestampFields: Partial<{ heureAcceptee: Date; heurePrete: Date; heureServie: Date }> = {};
  if (statut === "en_preparation") timestampFields.heureAcceptee = now;
  if (statut === "prete") timestampFields.heurePrete = now;
  if (statut === "servie") timestampFields.heureServie = now;

  const [commande] = await tx.update(commandes).set({ statut, ...timestampFields, updatedAt: now })
      .where(and(
        eq(commandes.id, input.id),
        ...(input.restaurantId
          ? [eq(commandes.restaurantId, input.restaurantId)]
          : []),
        ...(input.clientId ? [eq(commandes.clientId, input.clientId)] : []),
        inArray(commandes.statut, previousStatuses),
        ...(statut === "servie" && !input.allowDeliveryCompletion
          ? [ne(commandes.modeCommande, "livraison")]
          : []),
      )).returning();
  if (!commande) return undefined;
  const paymentTransition = statut === "servie"
    ? await confirmRestaurantOrderCashInTransaction(tx, input.id, now)
    : statut === "annulee"
      ? await cancelRestaurantOrderTransactionInTransaction(tx, input.id, now)
      : null;
  const transition = statut === "servie" || statut === "annulee"
    ? await transitionCommissionForOrder(tx, input.id, statut, now)
    : null;
  if (statut === "annulee") {
    await releaseOrderRecoveryReservationsInTransaction(tx, input.id, now);
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
  input: RestaurantOrderTransitionInput,
) {
  const result = await transactionalDb.transaction((tx) =>
    applyRestaurantOrderTransition(tx, input),
  );
  if (!result) return undefined;
  await scheduleRestaurantOrderTransitionEffects(result);
  return result.commande;
}

/** Compatibilité des contrôleurs existants, déléguée au moteur canonique. */
export async function updateStatutCommande(
  id: string,
  restaurantId: string,
  statut: StatutCommande,
) {
  return transitionRestaurantOrder({ id, restaurantId, targetStatus: statut });
}
