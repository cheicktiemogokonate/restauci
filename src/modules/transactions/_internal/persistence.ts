import "server-only";

import { and, asc, eq, ne, sql } from "drizzle-orm";
import {
  financialTransactions,
  payments,
} from "@/infrastructure/db/schema";
import type { TransactionExecutor } from "@/infrastructure/db/transaction";
import type {
  ConfirmPaymentInput,
  CreateFinancialTransactionInput,
  CreatePaymentAttemptInput,
  PaymentConfirmationResult,
} from "../contracts";
import {
  assertPaymentDetails,
  assertPositiveFcfa,
  assertRefundCapacity,
  FinancialTransactionError,
} from "../model";

function normalizeOptionalText(
  value: string | null | undefined,
  maxLength: number,
): string | null {
  const normalized = value?.trim() || null;
  if (normalized && normalized.length > maxLength) {
    throw new FinancialTransactionError(
      "INVALID_PAYMENT_DETAILS",
      `La valeur dépasse ${maxLength} caractères.`,
    );
  }
  return normalized;
}

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 3; depth += 1) {
    if (typeof current !== "object" || current === null) return false;
    if ("code" in current && current.code === "23505") return true;
    current = "cause" in current ? current.cause : null;
  }
  return false;
}

export async function createFinancialTransactionRecord(
  tx: TransactionExecutor,
  input: CreateFinancialTransactionInput,
) {
  assertPositiveFcfa(input.amountFcfa);
  if (input.type === "remboursement") {
    const refundIdempotencyKey = normalizeOptionalText(
      input.refundIdempotencyKey,
      128,
    );
    if (!refundIdempotencyKey) {
      throw new FinancialTransactionError(
        "REFUND_NOT_ALLOWED",
        "Une clé d’idempotence est obligatoire pour un remboursement.",
      );
    }
    await tx.execute(
      sql`SELECT id FROM ${payments} WHERE id = ${input.originalPaymentId} FOR UPDATE`,
    );
    const originalPayment = await tx.query.payments.findFirst({
      where: eq(payments.id, input.originalPaymentId),
      with: { transaction: true },
    });
    if (
      !originalPayment ||
      originalPayment.status !== "confirmed" ||
      originalPayment.transaction.type === "remboursement"
    ) {
      throw new FinancialTransactionError(
        "REFUND_NOT_ALLOWED",
        "Seul un paiement confirmé d’origine peut être remboursé.",
      );
    }
    if (originalPayment.transaction.partnerAccountId !== input.partnerAccountId) {
      throw new FinancialTransactionError(
        "REFUND_NOT_ALLOWED",
        "Le remboursement doit rester rattaché au compte partenaire d’origine.",
      );
    }

    const existing = await tx.query.financialTransactions.findFirst({
      where: and(
        eq(financialTransactions.originalPaymentId, input.originalPaymentId),
        eq(financialTransactions.refundIdempotencyKey, refundIdempotencyKey),
      ),
    });
    if (existing) {
      if (
        existing.partnerAccountId !== input.partnerAccountId ||
        existing.amountFcfa !== input.amountFcfa
      ) {
        throw new FinancialTransactionError(
          "PAYMENT_CONFLICT",
          "Cette clé d’idempotence correspond à un autre remboursement.",
        );
      }
      return existing;
    }

    const [refundTotal] = await tx
      .select({
        amountFcfa: sql<number>`COALESCE(SUM(${financialTransactions.amountFcfa}), 0)::int`,
      })
      .from(financialTransactions)
      .where(
        and(
          eq(financialTransactions.type, "remboursement"),
          eq(financialTransactions.originalPaymentId, input.originalPaymentId),
          sql`${financialTransactions.status} <> 'cancelled'`,
        ),
      );
    assertRefundCapacity({
      originalAmountFcfa: originalPayment.amountFcfa,
      alreadyRefundedFcfa: Number(refundTotal?.amountFcfa ?? 0),
      requestedAmountFcfa: input.amountFcfa,
    });
  }
  const source =
    input.type === "commande_restaurant"
      ? { restaurantOrderId: input.restaurantOrderId }
      : input.type === "abonnement_partenaire"
        ? { subscriptionRequestId: input.subscriptionRequestId }
        : input.type === "commission_settlement"
          ? { commissionSettlementId: input.commissionSettlementId }
          : input.type === "reservation_residence"
            ? { residenceReservationId: input.residenceReservationId }
            : {
                originalPaymentId: input.originalPaymentId,
                refundIdempotencyKey: input.refundIdempotencyKey.trim(),
              };

  try {
    const [created] = await tx
      .insert(financialTransactions)
      .values({
        type: input.type,
        status: "pending",
        partnerAccountId: input.partnerAccountId,
        clientId: input.clientId ?? null,
        amountFcfa: input.amountFcfa,
        currency: "XOF",
        ...source,
      })
      .returning();
    if (!created) throw new Error("Création de transaction impossible.");
    return created;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new FinancialTransactionError(
        "PAYMENT_CONFLICT",
        "Une transaction existe déjà pour cette source métier.",
      );
    }
    throw error;
  }
}

export async function createPaymentAttemptRecord(
  tx: TransactionExecutor,
  input: CreatePaymentAttemptInput,
) {
  assertPositiveFcfa(input.amountFcfa);
  const provider = normalizeOptionalText(input.provider, 50);
  const providerReference = normalizeOptionalText(input.providerReference, 255);
  const recordedReference = normalizeOptionalText(input.recordedReference, 255);
  const idempotencyKey = normalizeOptionalText(input.idempotencyKey, 128);
  assertPaymentDetails({
    method: input.method,
    network: input.network,
    provider,
    providerReference,
  });

  await tx.execute(
    sql`SELECT id FROM ${financialTransactions} WHERE id = ${input.transactionId} FOR UPDATE`,
  );
  const transaction = await tx.query.financialTransactions.findFirst({
    where: eq(financialTransactions.id, input.transactionId),
  });
  if (!transaction) {
    throw new FinancialTransactionError(
      "TRANSACTION_NOT_FOUND",
      "Transaction financière introuvable.",
    );
  }
  if (transaction.status === "paid") {
    throw new FinancialTransactionError(
      "TRANSACTION_ALREADY_PAID",
      "Cette transaction est déjà payée.",
    );
  }
  if (transaction.status === "cancelled") {
    throw new FinancialTransactionError(
      "TRANSACTION_CANCELLED",
      "Cette transaction est annulée.",
    );
  }
  if (input.amountFcfa !== transaction.amountFcfa) {
    throw new FinancialTransactionError(
      "INVALID_AMOUNT",
      "Le paiement principal doit correspondre au montant de la transaction.",
    );
  }

  if (idempotencyKey) {
    const existing = await tx.query.payments.findFirst({
      where: and(
        eq(payments.transactionId, transaction.id),
        eq(payments.idempotencyKey, idempotencyKey),
      ),
    });
    if (existing) {
      if (
        existing.amountFcfa !== input.amountFcfa ||
        existing.method !== input.method ||
        existing.network !== (input.network ?? null) ||
        existing.provider !== provider ||
        existing.providerReference !== providerReference ||
        existing.recordedReference !== recordedReference
      ) {
        throw new FinancialTransactionError(
          "PAYMENT_CONFLICT",
          "Cette clé d’idempotence correspond à une autre tentative.",
        );
      }
      return existing;
    }
  }

  try {
    const [created] = await tx
      .insert(payments)
      .values({
        transactionId: transaction.id,
        provider,
        method: input.method,
        network: input.network ?? null,
        status: "pending",
        amountFcfa: input.amountFcfa,
        providerReference,
        recordedReference,
        idempotencyKey,
        recoverySettlementId: input.recoverySettlementId ?? null,
      })
      .returning();
    if (!created) throw new Error("Création de paiement impossible.");
    return created;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new FinancialTransactionError(
        "PAYMENT_CONFLICT",
        "Cette tentative de paiement existe déjà.",
      );
    }
    throw error;
  }
}

export async function confirmPaymentRecord(
  tx: TransactionExecutor,
  input: ConfirmPaymentInput,
): Promise<PaymentConfirmationResult> {
  const candidate = await tx.query.payments.findFirst({
    where: eq(payments.id, input.paymentId),
    columns: { transactionId: true },
  });
  if (!candidate) {
    throw new FinancialTransactionError(
      "PAYMENT_NOT_FOUND",
      "Tentative de paiement introuvable.",
    );
  }

  // Toutes les confirmations verrouillent d'abord l'obligation, puis la
  // tentative : deux paiements concurrents suivent ainsi le même ordre.
  await tx.execute(
    sql`SELECT id FROM ${financialTransactions} WHERE id = ${candidate.transactionId} FOR UPDATE`,
  );
  await tx.execute(sql`SELECT id FROM ${payments} WHERE id = ${input.paymentId} FOR UPDATE`);

  const transaction = await tx.query.financialTransactions.findFirst({
    where: eq(financialTransactions.id, candidate.transactionId),
  });
  const payment = await tx.query.payments.findFirst({
    where: eq(payments.id, input.paymentId),
  });
  if (!transaction) {
    throw new FinancialTransactionError(
      "TRANSACTION_NOT_FOUND",
      "Transaction financière introuvable.",
    );
  }
  if (!payment) {
    throw new FinancialTransactionError(
      "PAYMENT_NOT_FOUND",
      "Tentative de paiement introuvable.",
    );
  }
  if (payment.status === "confirmed") {
    if (transaction.status !== "paid") {
      throw new FinancialTransactionError(
        "PAYMENT_CONFLICT",
        "État financier incohérent.",
      );
    }
    return {
      paymentId: payment.id,
      transactionId: transaction.id,
      alreadyConfirmed: true,
    };
  }
  if (transaction.status === "paid") {
    throw new FinancialTransactionError(
      "TRANSACTION_ALREADY_PAID",
      "Cette transaction a déjà été réglée par une autre tentative.",
    );
  }
  if (transaction.status === "cancelled") {
    throw new FinancialTransactionError(
      "TRANSACTION_CANCELLED",
      "Une transaction annulée ne peut pas être payée.",
    );
  }
  if (payment.status !== "pending") {
    throw new FinancialTransactionError(
      "PAYMENT_NOT_CONFIRMABLE",
      "Cette tentative ne peut plus être confirmée.",
    );
  }

  const now = input.now ?? new Date();
  const [confirmed] = await tx
    .update(payments)
    .set({
      status: "confirmed",
      confirmedAt: now,
      confirmedByAdminId: input.confirmedByAdminId ?? null,
      updatedAt: now,
    })
    .where(and(eq(payments.id, payment.id), eq(payments.status, "pending")))
    .returning({ id: payments.id });
  const [paid] = await tx
    .update(financialTransactions)
    .set({ status: "paid", paidAt: now, updatedAt: now })
    .where(
      and(
        eq(financialTransactions.id, transaction.id),
        eq(financialTransactions.status, "pending"),
      ),
    )
    .returning({ id: financialTransactions.id });
  if (!confirmed || !paid) {
    throw new FinancialTransactionError(
      "PAYMENT_CONFLICT",
      "La confirmation concurrente n'a pas pu être résolue.",
    );
  }
  await tx
    .update(payments)
    .set({ status: "cancelled", cancelledAt: now, updatedAt: now })
    .where(
      and(
        eq(payments.transactionId, transaction.id),
        eq(payments.status, "pending"),
        ne(payments.id, payment.id),
      ),
    );
  return {
    paymentId: confirmed.id,
    transactionId: paid.id,
    alreadyConfirmed: false,
  };
}

export async function failPaymentRecord(
  tx: TransactionExecutor,
  paymentId: string,
  now = new Date(),
) {
  await tx.execute(sql`SELECT id FROM ${payments} WHERE id = ${paymentId} FOR UPDATE`);
  const payment = await tx.query.payments.findFirst({
    where: eq(payments.id, paymentId),
  });
  if (!payment) {
    throw new FinancialTransactionError(
      "PAYMENT_NOT_FOUND",
      "Tentative de paiement introuvable.",
    );
  }
  if (payment.status === "failed") return payment;
  if (payment.status !== "pending") {
    throw new FinancialTransactionError(
      "PAYMENT_NOT_CONFIRMABLE",
      "Cette tentative ne peut pas être marquée en échec.",
    );
  }
  const [failed] = await tx
    .update(payments)
    .set({ status: "failed", failedAt: now, updatedAt: now })
    .where(and(eq(payments.id, paymentId), eq(payments.status, "pending")))
    .returning();
  if (!failed) {
    throw new FinancialTransactionError("PAYMENT_CONFLICT", "Échec concurrent.");
  }
  return failed;
}

export async function cancelFinancialTransactionRecord(
  tx: TransactionExecutor,
  transactionId: string,
  now = new Date(),
) {
  await tx.execute(
    sql`SELECT id FROM ${financialTransactions} WHERE id = ${transactionId} FOR UPDATE`,
  );
  const transaction = await tx.query.financialTransactions.findFirst({
    where: eq(financialTransactions.id, transactionId),
  });
  if (!transaction) {
    throw new FinancialTransactionError(
      "TRANSACTION_NOT_FOUND",
      "Transaction financière introuvable.",
    );
  }
  if (transaction.status === "paid") {
    throw new FinancialTransactionError(
      "TRANSACTION_ALREADY_PAID",
      "Une transaction payée ne peut pas être annulée.",
    );
  }
  if (transaction.status === "cancelled") return transaction;

  await tx
    .update(payments)
    .set({ status: "cancelled", cancelledAt: now, updatedAt: now })
    .where(
      and(
        eq(payments.transactionId, transaction.id),
        eq(payments.status, "pending"),
      ),
    );
  const [cancelled] = await tx
    .update(financialTransactions)
    .set({ status: "cancelled", cancelledAt: now, updatedAt: now })
    .where(
      and(
        eq(financialTransactions.id, transaction.id),
        eq(financialTransactions.status, "pending"),
      ),
    )
    .returning();
  if (!cancelled) {
    throw new FinancialTransactionError("PAYMENT_CONFLICT", "Annulation concurrente.");
  }
  return cancelled;
}

export async function getRestaurantOrderTransactionRecord(
  tx: TransactionExecutor,
  restaurantOrderId: string,
) {
  return tx.query.financialTransactions.findFirst({
    where: and(
      eq(financialTransactions.type, "commande_restaurant"),
      eq(financialTransactions.restaurantOrderId, restaurantOrderId),
    ),
    with: { payments: { orderBy: [asc(payments.createdAt)] } },
  });
}

export async function getSubscriptionTransactionRecord(
  tx: TransactionExecutor,
  subscriptionRequestId: string,
) {
  return tx.query.financialTransactions.findFirst({
    where: and(
      eq(financialTransactions.type, "abonnement_partenaire"),
      eq(financialTransactions.subscriptionRequestId, subscriptionRequestId),
    ),
    with: { payments: { orderBy: [asc(payments.createdAt)] } },
  });
}

export async function getResidenceReservationTransactionRecord(
  tx: TransactionExecutor,
  residenceReservationId: string,
) {
  return tx.query.financialTransactions.findFirst({
    where: and(
      eq(financialTransactions.type, "reservation_residence"),
      eq(
        financialTransactions.residenceReservationId,
        residenceReservationId,
      ),
    ),
    with: { payments: { orderBy: [asc(payments.createdAt)] } },
  });
}
