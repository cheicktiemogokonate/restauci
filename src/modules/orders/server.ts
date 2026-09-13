import "server-only";

import { db } from "@/infrastructure/db";
import {
  createRestaurantOrder as createRestaurantOrderRecord,
  type CreateRestaurantOrderResult,
} from "./_internal/create";
import {
  applyRestaurantOrderTransition,
  scheduleRestaurantOrderTransitionEffects,
  transitionRestaurantOrder as transitionRestaurantOrderRecord,
} from "./_internal/transitions";
import type { TransactionExecutor } from "@/infrastructure/db";
import { isRestaurantOrderable } from "@/modules/restaurants/model";
import {
  getRestaurantOrderCandidateBySlug,
  getRestaurantOrderContext,
} from "@/modules/restaurants/server";
import {
  prevalidateRestaurantOrderSchema,
  adminOrderSupportSchema,
  adminRestaurantOrdersSchema,
  clientOrderListSchema,
  restaurantOrderListSchema,
  type AdminRestaurantOrdersInput,
  type ClientOrderListInput,
  type PrevalidateRestaurantOrderInput,
  type RestaurantOrderListInput,
  type AdminOrderSupportInput,
  type LegacyRestaurantOrderTransitionInput,
} from "./contracts";
import { RestaurantOrderError } from "./model";
import { validateRestaurantOrderGeography } from "./_internal/geography";
import {
  countActiveRestaurantOrders,
  getAdminRestaurantOrderEvolutionRecords,
  getAdminOrderDetailRecord,
  getClientOrderRecord,
  getClientOrderStateRecord,
  getRestaurantOrderRecord,
  getRestaurantOrderPaymentStateRecord,
  getDeliveryOrderContextRecord,
  listClientOrderRecords,
  listAdminRestaurantOrderRecords,
  listRestaurantOrderRecords,
} from "./_internal/persistence";
import {
  getAdminOrderSupportSummaryRecord,
  listAdminOrderSupportRecords,
} from "./_internal/support";

export type { AdminOrderSupportSignal } from "./contracts";

export function listAdminOrderSupport(
  input: Partial<AdminOrderSupportInput> = {},
) {
  return listAdminOrderSupportRecords(adminOrderSupportSchema.parse(input));
}

export const getAdminOrderSupportSummary =
  getAdminOrderSupportSummaryRecord;

export { RestaurantOrderError } from "./model";
export type { CreateRestaurantOrderResult } from "./_internal/create";
export {
  schedulePaidRestaurantOrderEffects,
  scheduleRestaurantOrderCreatedEffects,
} from "./_internal/effects";
export { releasePaidRestaurantOrderInTransaction } from "./_internal/payment";
export type {
  RestaurantOrderActor,
  TransitionRestaurantOrderCommand,
} from "./contracts";

export async function createRestaurantOrder(
  input: Parameters<typeof createRestaurantOrderRecord>[0],
): Promise<CreateRestaurantOrderResult> {
  return createRestaurantOrderRecord(input);
}

export function transitionRestaurantOrder(
  actor: Parameters<typeof transitionRestaurantOrderRecord>[0],
  command: Parameters<typeof transitionRestaurantOrderRecord>[1],
) {
  return transitionRestaurantOrderRecord(actor, command);
}

export function transitionRestaurantOrderInTransaction(
  tx: TransactionExecutor,
  actor: Parameters<typeof applyRestaurantOrderTransition>[1],
  command: Parameters<typeof applyRestaurantOrderTransition>[2],
) {
  return applyRestaurantOrderTransition(tx, actor, command);
}

/** Compatibilité des scénarios DB historiques, sans dupliquer la machine d'état. */
export function applyLegacyRestaurantOrderTransition(
  tx: TransactionExecutor,
  input: LegacyRestaurantOrderTransitionInput,
) {
  const actor = input.restaurantId
    ? {
        type: input.allowDeliveryCompletion ? "delivery" as const : "restaurant" as const,
        id: input.restaurantId,
        restaurantId: input.restaurantId,
      }
    : input.clientId
      ? { type: "client" as const, id: input.clientId, clientId: input.clientId }
      : { type: "system" as const, id: "legacy-system" };
  return transitionRestaurantOrderInTransaction(tx, actor, {
    orderId: input.id,
    targetStatus: input.targetStatus,
    allowedPreviousStatuses: input.allowedPreviousStatuses,
    allowDeliveryCompletion: input.allowDeliveryCompletion,
    now: input.now,
  });
}

export { scheduleRestaurantOrderTransitionEffects };

export async function prevalidateRestaurantOrder(
  input: PrevalidateRestaurantOrderInput,
) {
  const parsed = prevalidateRestaurantOrderSchema.parse(input);
  const candidate = await getRestaurantOrderCandidateBySlug(
    parsed.restaurantSlug,
  );
  const restaurant = candidate
    ? await getRestaurantOrderContext(candidate.id)
    : null;
  if (!restaurant) {
    throw new RestaurantOrderError(
      "RESTAURANT_NOT_FOUND",
      "Restaurant introuvable.",
    );
  }
  if (
    !isRestaurantOrderable({
      ...restaurant,
    })
  ) {
    throw new RestaurantOrderError(
      "RESTAURANT_NOT_ORDERABLE",
      "Ce restaurant n'accepte pas de commandes actuellement.",
    );
  }
  if (!restaurant.modesCommande.includes(parsed.modeCommande)) {
    throw new RestaurantOrderError(
      "ORDER_MODE_NOT_SUPPORTED",
      "Ce mode de commande n'est pas proposé par le restaurant.",
    );
  }
  const geography = await validateRestaurantOrderGeography(db, restaurant, parsed);
  return { valid: true as const, geography };
}

export function getRestaurantActiveOrderCount(restaurantId: string) {
  return countActiveRestaurantOrders(restaurantId);
}

export function listRestaurantOrders(
  restaurantId: string,
  input: RestaurantOrderListInput,
) {
  return listRestaurantOrderRecords(
    restaurantId,
    restaurantOrderListSchema.parse(input),
  );
}

export function getRestaurantOrder(orderId: string, restaurantId: string) {
  return getRestaurantOrderRecord(orderId, restaurantId);
}

export function listClientOrders(clientId: string, input: ClientOrderListInput) {
  return listClientOrderRecords({
    clientId,
    ...clientOrderListSchema.parse(input),
  });
}

export function getClientOrder(orderId: string, clientId: string) {
  return getClientOrderRecord(orderId, clientId);
}

export function getClientOrderState(orderId: string, clientId: string) {
  return getClientOrderStateRecord(orderId, clientId);
}

export function getRestaurantOrderPaymentStateInTransaction(
  tx: TransactionExecutor,
  orderId: string,
) {
  return getRestaurantOrderPaymentStateRecord(orderId, tx);
}

export function getRestaurantOrderPaymentState(orderId: string) {
  return getRestaurantOrderPaymentStateRecord(orderId);
}

export function getDeliveryOrderContextInTransaction(
  tx: TransactionExecutor,
  input: { orderId: string; restaurantId: string },
) {
  return getDeliveryOrderContextRecord(
    input.orderId,
    input.restaurantId,
    tx,
  );
}

export function getAdminOrderDetail(orderId: string) {
  return getAdminOrderDetailRecord(orderId);
}

export function listAdminRestaurantOrders(input: AdminRestaurantOrdersInput) {
  return listAdminRestaurantOrderRecords(
    adminRestaurantOrdersSchema.parse(input),
  );
}

export function getAdminRestaurantOrderEvolution(
  restaurantId: string,
  days = 30,
) {
  const id = adminRestaurantOrdersSchema.shape.restaurantId.parse(restaurantId);
  const parsedDays = adminRestaurantOrdersSchema.shape.limit.parse(days);
  return getAdminRestaurantOrderEvolutionRecords(id, parsedDays);
}

export async function completeDeliveryOrderInTransaction(
  tx: TransactionExecutor,
  input: { orderId: string; restaurantId: string; now: Date },
) {
  const result = await applyRestaurantOrderTransition(tx, {
    type: "delivery",
    id: input.orderId,
    restaurantId: input.restaurantId,
  }, {
    orderId: input.orderId,
    targetStatus: "servie",
    allowedPreviousStatuses: ["prete"],
    allowDeliveryCompletion: true,
    now: input.now,
  });
  if (!result) {
    throw new Error("La commande a déjà été clôturée.");
  }
  return result;
}

export function scheduleCompletedDeliveryOrderEffects(
  result: NonNullable<
    Awaited<ReturnType<typeof applyRestaurantOrderTransition>>
  >,
) {
  return scheduleRestaurantOrderTransitionEffects(result);
}

export async function cancelDeliveryOrderInTransaction(
  tx: TransactionExecutor,
  input: { orderId: string; restaurantId: string; now: Date },
) {
  const result = await applyRestaurantOrderTransition(
    tx,
    {
      type: "delivery",
      id: input.orderId,
      restaurantId: input.restaurantId,
    },
    {
      orderId: input.orderId,
      targetStatus: "annulee",
      allowDeliveryCompletion: true,
      now: input.now,
    },
  );
  if (!result) {
    throw new Error("La commande a déjà été clôturée.");
  }
  return result;
}

export function scheduleCancelledDeliveryOrderEffects(
  result: NonNullable<
    Awaited<ReturnType<typeof applyRestaurantOrderTransition>>
  >,
) {
  return scheduleRestaurantOrderTransitionEffects(result);
}
