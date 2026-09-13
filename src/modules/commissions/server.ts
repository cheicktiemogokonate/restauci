import "server-only";

import { calculerCommissionFcfa } from "@/shared/money";
import type { TransactionExecutor } from "@/infrastructure/db/transaction";
import { getEffectiveSubscriptionContext } from "@/modules/subscriptions/server";
import {
  adminCommissionListSchema,
  partnerCommissionWorkspaceSchema,
  type AdminCommissionListInput,
  type CreateResidenceCommissionInput,
  type PartnerCommissionWorkspaceInput,
} from "./contracts";
import type { CommissionSnapshot } from "./model";
import {
  createResidenceCommissionRecord,
  getProviderSplitCommissionRecord,
  voidPendingResidenceCommissionRecord,
} from "./_internal/persistence";
import {
  getCommissionPolicyRecord,
  getPartnerCommissionWorkspaceRecord,
  listAdminCommissionRecords,
  listAdminRestaurantCommissionDebtRecords,
} from "./_internal/queries";

export function getCommissionPolicy() {
  return getCommissionPolicyRecord();
}

export function listAdminCommissions(input: Partial<AdminCommissionListInput> = {}) {
  return listAdminCommissionRecords(adminCommissionListSchema.parse(input));
}

export function listAdminRestaurantCommissionDebts() {
  return listAdminRestaurantCommissionDebtRecords();
}

export function getPartnerCommissionWorkspace(
  input: Pick<PartnerCommissionWorkspaceInput, "partnerAccountId"> &
    Partial<Omit<PartnerCommissionWorkspaceInput, "partnerAccountId">>,
) {
  return getPartnerCommissionWorkspaceRecord(
    partnerCommissionWorkspaceSchema.parse(input),
  );
}

export function getProviderSplitCommission(
  source: Parameters<typeof getProviderSplitCommissionRecord>[0],
  options: { executor?: Parameters<typeof getProviderSplitCommissionRecord>[1] } = {},
) {
  return getProviderSplitCommissionRecord(source, options.executor);
}

export {
  CommissionLedgerError,
  commissionLedgerHttpStatus,
  confirmReservedSettlementInTransaction,
  createCommissionSnapshot,
  createManualCommissionSettlement,
  createPaystackSettlementInTransaction,
  getAvailableCashCommissionDebt,
  getCashCommissionStatus,
  getCashCommissionStatusInTransaction,
  getEffectiveCommissionRateSnapshot,
  getOutstandingCashCommissionDebt,
  preparePaystackCommissionSettlement,
  releaseOrderRecoveryReservationsInTransaction,
  releaseReservedSettlementInTransaction,
  reserveOrderRecoveryInTransaction,
  scheduleDebtCycleNotification,
  transitionCommissionForOrder,
  updateCommissionPolicy,
  validateCommissionPolicy,
} from "./_internal/ledger";
export type { CommissionPolicyInput } from "./_internal/ledger";

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
