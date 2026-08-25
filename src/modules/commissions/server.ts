import "server-only";

import { calculerCommissionFcfa } from "@/lib/money";
import type { TransactionExecutor } from "@/lib/db/transaction";
import { getEffectiveSubscriptionContext } from "@/modules/subscriptions/server";
import type { CreateResidenceCommissionInput } from "./contracts";
import type { CommissionSnapshot } from "./model";
import {
  createResidenceCommissionRecord,
  voidPendingResidenceCommissionRecord,
} from "./_internal/persistence";

export async function createResidenceCommissionInTransaction(
  tx: TransactionExecutor,
  input: CreateResidenceCommissionInput,
) {
  const context = await getEffectiveSubscriptionContext(input.partnerAccountId, {
    executor: tx,
    now: input.now,
  });
  if (context.activityType !== "residence") {
    throw new Error("Le compte partenaire n’est pas une activité Résidence");
  }
  const snapshot: CommissionSnapshot = {
    baseAmountFcfa: input.baseAmountFcfa,
    rateBpsSnapshot: context.plan.rateBps,
    amountFcfa: calculerCommissionFcfa(
      input.baseAmountFcfa,
      context.plan.rateBps,
    ),
    collectionMode: "provider_split",
  };
  return createResidenceCommissionRecord(tx, {
    residenceReservationId: input.residenceReservationId,
    partnerAccountId: input.partnerAccountId,
    snapshot,
    now: input.now ?? new Date(),
  });
}

export const voidPendingResidenceCommissionInTransaction =
  voidPendingResidenceCommissionRecord;

export type { CreateResidenceCommissionInput } from "./contracts";
export type { CommissionSnapshot } from "./model";
