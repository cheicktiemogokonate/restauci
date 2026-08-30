import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  financialTransactions,
  paymentProviderAccounts,
} from "@/lib/db/schema";
import {
  transactionalDb,
  type DbExecutor,
  type TransactionExecutor,
} from "@/lib/db/transaction";
import type {
  ConfirmPaymentInput,
  CreateFinancialTransactionInput,
  CreatePaymentAttemptInput,
} from "./contracts";
import { FinancialTransactionError } from "./model";
import {
  cancelFinancialTransactionRecord,
  confirmPaymentRecord,
  createFinancialTransactionRecord,
  createPaymentAttemptRecord,
  failPaymentRecord,
  getRestaurantOrderTransactionRecord,
  getResidenceReservationTransactionRecord,
  getSubscriptionTransactionRecord,
} from "./_internal/persistence";

export const createTransactionInTransaction = createFinancialTransactionRecord;
export const createPaymentAttemptInTransaction = createPaymentAttemptRecord;
export const confirmPaymentInTransaction = confirmPaymentRecord;
export const failPaymentInTransaction = failPaymentRecord;
export const cancelTransactionInTransaction = cancelFinancialTransactionRecord;
export const getSubscriptionTransactionInTransaction =
  getSubscriptionTransactionRecord;
export const getResidenceReservationTransactionInTransaction =
  getResidenceReservationTransactionRecord;

export async function hasActivePaystackProviderAccount(
  partnerAccountId: string,
  executor: DbExecutor = db,
) {
  const account = await executor.query.paymentProviderAccounts.findFirst({
    where: and(
      eq(paymentProviderAccounts.partnerAccountId, partnerAccountId),
      eq(paymentProviderAccounts.provider, "paystack"),
      eq(paymentProviderAccounts.status, "active"),
    ),
    columns: { id: true },
  });
  return Boolean(account);
}

export async function getActivePaystackProviderAccount(
  partnerAccountId: string,
  executor: DbExecutor = db,
) {
  return executor.query.paymentProviderAccounts.findFirst({
    where: and(
      eq(paymentProviderAccounts.partnerAccountId, partnerAccountId),
      eq(paymentProviderAccounts.provider, "paystack"),
      eq(paymentProviderAccounts.status, "active"),
    ),
  });
}

export async function createTransaction(input: CreateFinancialTransactionInput) {
  return transactionalDb.transaction((tx) =>
    createFinancialTransactionRecord(tx, input),
  );
}

export async function createPaymentAttempt(input: CreatePaymentAttemptInput) {
  return transactionalDb.transaction((tx) => createPaymentAttemptRecord(tx, input));
}

export async function confirmPayment(input: ConfirmPaymentInput) {
  return transactionalDb.transaction((tx) => confirmPaymentRecord(tx, input));
}

export async function failPayment(paymentId: string, now = new Date()) {
  return transactionalDb.transaction((tx) =>
    failPaymentRecord(tx, paymentId, now),
  );
}

export async function cancelTransaction(transactionId: string, now = new Date()) {
  return transactionalDb.transaction((tx) =>
    cancelFinancialTransactionRecord(tx, transactionId, now),
  );
}

export async function getTransaction(transactionId: string) {
  return db.query.financialTransactions.findFirst({
    where: eq(financialTransactions.id, transactionId),
    with: { payments: true },
  });
}

export async function confirmRestaurantOrderCashInTransaction(
  tx: TransactionExecutor,
  orderId: string,
  now = new Date(),
) {
  const transaction = await getRestaurantOrderTransactionRecord(tx, orderId);
  if (!transaction) return null;
  if (transaction.status === "paid") {
    const confirmed = transaction.payments.find(
      (payment) => payment.status === "confirmed",
    );
    if (!confirmed) {
      throw new FinancialTransactionError("PAYMENT_CONFLICT", "État cash incohérent.");
    }
    return {
      paymentId: confirmed.id,
      transactionId: transaction.id,
      alreadyConfirmed: true,
    };
  }
  const pendingCash = transaction.payments.find(
    (payment) => payment.status === "pending" && payment.method === "cash",
  );
  if (!pendingCash) {
    throw new FinancialTransactionError(
      "PAYMENT_NOT_FOUND",
      "Tentative cash de la commande introuvable.",
    );
  }
  return confirmPaymentRecord(tx, { paymentId: pendingCash.id, now });
}

/**
 * Retourne la tentative qui fait autorité pour une commande : paiement déjà
 * confirmé, ou tentative cash encore en attente de remise physique.
 */
export async function getRestaurantOrderPaymentSummaryInTransaction(
  tx: TransactionExecutor,
  orderId: string,
) {
  const transaction = await getRestaurantOrderTransactionRecord(tx, orderId);
  if (!transaction) return null;
  const confirmed = transaction.payments.find(
    (payment) => payment.status === "confirmed",
  );
  const pendingCash = transaction.payments.find(
    (payment) => payment.status === "pending" && payment.method === "cash",
  );
  const payment = confirmed ?? pendingCash;
  return payment
    ? {
        transactionId: transaction.id,
        transactionStatus: transaction.status,
        paymentId: payment.id,
        paymentStatus: payment.status,
        method: payment.method,
        amountFcfa: payment.amountFcfa,
      }
    : null;
}

export async function cancelRestaurantOrderTransactionInTransaction(
  tx: TransactionExecutor,
  orderId: string,
  now = new Date(),
) {
  const transaction = await getRestaurantOrderTransactionRecord(tx, orderId);
  if (!transaction) return null;
  if (
    transaction.status === "paid" &&
    transaction.payments.some(
      (payment) => payment.status === "confirmed" && payment.provider === "paystack",
    )
  ) {
    throw new FinancialTransactionError(
      "TRANSACTION_ALREADY_PAID",
      "Une commande payée en ligne ne peut pas être annulée automatiquement sans remboursement. Contactez le support.",
    );
  }
  return cancelFinancialTransactionRecord(tx, transaction.id, now);
}

export async function recordConfirmedOfflinePaymentInTransaction(
  tx: TransactionExecutor,
  input: CreatePaymentAttemptInput & {
    confirmedByAdminId: string;
    now?: Date;
  },
) {
  const payment = await createPaymentAttemptRecord(tx, input);
  const confirmation = await confirmPaymentRecord(tx, {
    paymentId: payment.id,
    confirmedByAdminId: input.confirmedByAdminId,
    now: input.now,
  });
  return { payment, confirmation };
}
