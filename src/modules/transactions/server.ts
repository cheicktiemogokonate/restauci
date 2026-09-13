import "server-only";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/infrastructure/db";
import {
  financialJournalEntries,
  financialTransactions,
  paymentProviderAccounts,
  payments,
} from "@/infrastructure/db/schema";
import { persistNotification } from "@/modules/notifications/server";
import { persistBusinessEvent } from "@/modules/events/server";
import {
  transactionalDb,
  type DbExecutor,
  type TransactionExecutor,
} from "@/infrastructure/db/transaction";
import type {
  ConfirmPaymentInput,
  AdminFinancialJournalEntryDTO,
  CreateFinancialTransactionInput,
  CreatePaymentAttemptInput,
  FinancialActor,
  RecordConfirmedPaymentJournalInput,
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

export {
  associatePaystackProviderAccount,
  configurePartnerPayoutDestination,
  disablePaystackProviderAccount,
  getPartnerPayoutDestination,
  getPaystackProviderAccount,
  listPaystackPayoutInstitutions,
  refreshPartnerPayoutDestination,
} from "./_internal/provider-accounts";

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

export async function recordConfirmedPaymentJournalInTransaction(
  tx: TransactionExecutor,
  input: RecordConfirmedPaymentJournalInput,
) {
  const existing = await tx.query.financialJournalEntries.findFirst({
    where: and(
      eq(financialJournalEntries.paymentId, input.paymentId),
      eq(financialJournalEntries.entryType, "payment_confirmed"),
    ),
  });
  if (existing) return existing;

  const payment = await tx.query.payments.findFirst({
    where: eq(payments.id, input.paymentId),
    with: { transaction: true },
  });
  if (!payment) {
    throw new FinancialTransactionError(
      "PAYMENT_NOT_FOUND",
      "Tentative de paiement introuvable.",
    );
  }
  if (
    payment.status !== "confirmed" ||
    payment.transaction.status !== "paid"
  ) {
    throw new FinancialTransactionError(
      "PAYMENT_NOT_CONFIRMABLE",
      "Seul un paiement confirmé peut être journalisé.",
    );
  }

  const [entry] = await tx
    .insert(financialJournalEntries)
    .values({
      transactionId: payment.transactionId,
      paymentId: payment.id,
      partnerAccountId: payment.transaction.partnerAccountId,
      eventId: input.eventId,
      entryType: "payment_confirmed",
      direction: "inflow",
      channel: input.channel,
      amountFcfa: payment.amountFcfa,
      currency: "XOF",
      provider: payment.provider,
      method: payment.method,
      reference: payment.providerReference ?? payment.recordedReference,
      actorType: input.actor.type,
      actorId: input.actor.id,
      occurredAt: input.occurredAt ?? new Date(),
    })
    .returning();
  if (!entry) {
    throw new FinancialTransactionError(
      "PAYMENT_CONFLICT",
      "L'encaissement confirmé n'a pas pu être journalisé.",
    );
  }
  return entry;
}

export async function createRefundObligation(input: {
  originalPaymentId: string;
  amountFcfa: number;
  refundIdempotencyKey: string;
  actor: FinancialActor;
  now?: Date;
}) {
  return transactionalDb.transaction((tx) =>
    createRefundObligationInTransaction(tx, input),
  );
}

export async function createRefundObligationInTransaction(
  tx: TransactionExecutor,
  input: {
    originalPaymentId: string;
    amountFcfa: number;
    refundIdempotencyKey: string;
    actor: FinancialActor;
    now?: Date;
  },
) {
    const originalPayment = await tx.query.payments.findFirst({
      where: eq(payments.id, input.originalPaymentId),
      with: {
        transaction: {
          with: { partnerAccount: { with: { user: true } } },
        },
      },
    });
    if (!originalPayment) {
      throw new FinancialTransactionError(
        "PAYMENT_NOT_FOUND",
        "Paiement d’origine introuvable.",
      );
    }

    const transaction = await createFinancialTransactionRecord(tx, {
      type: "remboursement",
      originalPaymentId: input.originalPaymentId,
      refundIdempotencyKey: input.refundIdempotencyKey,
      partnerAccountId: originalPayment.transaction.partnerAccountId,
      clientId: originalPayment.transaction.clientId,
      amountFcfa: input.amountFcfa,
    });
    const existingJournal = await tx.query.financialJournalEntries.findFirst({
      where: and(
        eq(financialJournalEntries.transactionId, transaction.id),
        eq(
          financialJournalEntries.entryType,
          "refund_obligation_created",
        ),
      ),
    });
    if (existingJournal) {
      return { transaction, alreadyCreated: true };
    }

    const now = input.now ?? new Date();
    const eventId = randomUUID();
    const correlationId = randomUUID();
    await persistBusinessEvent(tx, {
      eventId,
      correlationId,
      type: "finance.refund.obligationcreated.v1",
      actor: input.actor,
      partnerAccountId: transaction.partnerAccountId,
      target: { type: "financial_transaction", id: transaction.id },
      occurredAt: now,
      payload: {
        amountFcfa: transaction.amountFcfa,
        currency: transaction.currency,
        originalPaymentId: input.originalPaymentId,
      },
      effects: [
        {
          type: "audit.project",
          payload: {
            action: "refund_obligation_created",
            details: {
              amountFcfa: transaction.amountFcfa,
              currency: transaction.currency,
              originalPaymentId: input.originalPaymentId,
            },
          },
        },
        {
          type: "notification.project",
          payload: {
            items: [
              {
                recipient: transaction.clientId
                  ? { type: "client", id: transaction.clientId }
                  : {
                      type: "user",
                      id: originalPayment.transaction.partnerAccount.userId,
                    },
                template: "refund_created",
                destination: { type: "remboursement", id: transaction.id },
              },
            ],
          },
        },
      ],
    });
    await tx.insert(financialJournalEntries).values({
      transactionId: transaction.id,
      paymentId: originalPayment.id,
      partnerAccountId: transaction.partnerAccountId,
      eventId,
      entryType: "refund_obligation_created",
      direction: "outflow",
      channel: "internal",
      amountFcfa: transaction.amountFcfa,
      currency: "XOF",
      provider: originalPayment.provider,
      method: originalPayment.method,
      reference:
        originalPayment.providerReference ?? originalPayment.recordedReference,
      actorType: input.actor.type,
      actorId: input.actor.id,
      occurredAt: now,
    });

    const notification = {
      type: "systeme" as const,
      titre: "Remboursement enregistré",
      message:
        "Une obligation de remboursement a été enregistrée et sera suivie par l’administration.",
      destination: { type: "remboursement" as const, id: transaction.id },
    };
    if (transaction.clientId) {
      await persistNotification(tx, {
        ...notification,
        clientId: transaction.clientId,
        eventId,
        correlationId,
      });
    } else {
      await persistNotification(tx, {
        ...notification,
        userId: originalPayment.transaction.partnerAccount.userId,
        eventId,
        correlationId,
      });
    }

    return { transaction, alreadyCreated: false };
}

export async function getAdminFinancialJournal(
  limit = 100,
): Promise<AdminFinancialJournalEntryDTO[]> {
  const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 250);
  const entries = await db.query.financialJournalEntries.findMany({
    orderBy: (journal, { desc }) => [desc(journal.occurredAt)],
    limit: boundedLimit,
    with: {
      transaction: true,
      payment: true,
      partnerAccount: { with: { user: true, restaurant: true } },
      subscriptionPeriod: true,
    },
  });
  return entries.map((entry) => {
    const transaction = entry.transaction;
    const sourceId =
      transaction.restaurantOrderId ??
      transaction.subscriptionRequestId ??
      transaction.commissionSettlementId ??
      transaction.residenceReservationId ??
      transaction.originalPaymentId!;
    return {
      id: entry.id,
      transactionId: entry.transactionId,
      transactionType: transaction.type,
      entryType: entry.entryType,
      direction: entry.direction,
      amountFcfa: entry.amountFcfa,
      currency: "XOF",
      channel: entry.channel,
      provider: entry.provider,
      method: entry.method,
      reference: entry.reference,
      occurredAt: entry.occurredAt,
      sourceId,
      partnerAccountId: entry.partnerAccountId,
      partnerName:
        entry.partnerAccount.restaurant?.nom ?? entry.partnerAccount.user.nom,
      activityType: entry.partnerAccount.activityType,
      entitlement: entry.subscriptionPeriod
        ? {
            type: "subscription_period" as const,
            id: entry.subscriptionPeriod.id,
            planCode: entry.subscriptionPeriod.planCode,
          }
        : null,
    };
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
