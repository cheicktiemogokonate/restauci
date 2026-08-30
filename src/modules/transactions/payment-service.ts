import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  clients,
  commandes,
  commissions,
  financialTransactions,
  partnerAccounts,
  paymentProviderAccounts,
  payments,
  residenceReservations,
  users,
} from "@/lib/db/schema";
import { transactionalDb, type TransactionExecutor } from "@/lib/db/transaction";
import {
  confirmReservedSettlementInTransaction,
  releaseReservedSettlementInTransaction,
  reserveOrderRecoveryInTransaction,
} from "@/lib/commissions/ledger";
import { activatePaidSubscriptionInTransaction } from "@/modules/subscriptions/server";
import { releasePaidRestaurantOrderInTransaction } from "@/lib/orders/provider-confirmation";
import { env } from "@/lib/env";
import { PaystackGateway, PaystackGatewayError } from "@/infrastructure/paystack/gateway";
import { confirmPaymentInTransaction, createPaymentAttemptInTransaction, failPaymentInTransaction } from "./server";
import type { PaymentGateway, VerifiedGatewayPayment } from "./contracts";
import type { PaymentMethod } from "./model";
import type { PaymentReturnChannel } from "./model";
import type { PaymentCallbackContext } from "./payment-return";

export class ProviderPaymentError extends Error {
  constructor(
    public readonly code:
      | "PAYMENT_NOT_FOUND"
      | "FORBIDDEN"
      | "NOT_PAYABLE"
      | "PROVIDER_MISMATCH"
      | "AMOUNT_MISMATCH"
      | "CURRENCY_MISMATCH"
      | "MOBILE_RETURN_NOT_CONFIGURED"
      | "INITIALIZATION_CONFLICT",
    message: string,
  ) {
    super(message);
    this.name = "ProviderPaymentError";
  }
}

export interface ProviderPaymentEffects {
  confirmResidenceReservationInTransaction?: (
    tx: TransactionExecutor,
    reservationId: string,
    now?: Date,
  ) => Promise<unknown>;
}

function syntheticPaymentEmail(id: string) {
  return `payments+${id.replace(/[^a-zA-Z0-9]/g, "")}@toutci.app`;
}

export async function initializePreparedPaystackPayment(
  input: {
    paymentId: string;
    owner: { clientId?: string; partnerAccountId?: string };
    returnChannel?: PaymentReturnChannel;
  },
  gateway: PaymentGateway = new PaystackGateway(),
) {
  const returnChannel = input.returnChannel ?? "web";
  if (returnChannel === "mobile" && !env.MOBILE_APP_PAYMENT_RETURN_URL) {
    throw new ProviderPaymentError(
      "MOBILE_RETURN_NOT_CONFIGURED",
      "Le retour de paiement mobile n’est pas configuré.",
    );
  }
  const payment = await db.query.payments.findFirst({
    where: eq(payments.id, input.paymentId),
    with: { transaction: true, recoverySettlement: true },
  });
  if (!payment || payment.provider !== "paystack" || !payment.providerReference) {
    throw new ProviderPaymentError("PAYMENT_NOT_FOUND", "Paiement Paystack introuvable.");
  }
  const transaction = payment.transaction;
  if (
    (input.owner.clientId && transaction.clientId !== input.owner.clientId) ||
    (input.owner.partnerAccountId && transaction.partnerAccountId !== input.owner.partnerAccountId) ||
    (!input.owner.clientId && !input.owner.partnerAccountId)
  ) {
    throw new ProviderPaymentError("FORBIDDEN", "Ce paiement ne vous appartient pas.");
  }
  if (payment.status !== "pending" || transaction.status !== "pending") {
    throw new ProviderPaymentError("NOT_PAYABLE", "Ce paiement n’est plus payable.");
  }
  if (payment.checkoutUrl) {
    if (payment.returnChannel !== returnChannel) {
      throw new ProviderPaymentError(
        "INITIALIZATION_CONFLICT",
        "Cette tentative de paiement a déjà été ouverte sur un autre canal.",
      );
    }
    return {
      authorizationUrl: payment.checkoutUrl,
      reference: payment.providerReference,
    };
  }

  let email = syntheticPaymentEmail(transaction.clientId ?? transaction.partnerAccountId);
  if (transaction.clientId) {
    const client = await db.query.clients.findFirst({ where: eq(clients.id, transaction.clientId), columns: { email: true } });
    email = client?.email ?? email;
  } else {
    const [partner] = await db.select({ email: users.email }).from(partnerAccounts)
      .innerJoin(users, eq(users.id, partnerAccounts.userId))
      .where(eq(partnerAccounts.id, transaction.partnerAccountId)).limit(1);
    email = partner?.email ?? email;
  }

  let split: { providerAccountReference: string; platformChargeFcfa: number; feeBearer: "account" } | undefined;
  if (transaction.type === "commande_restaurant" || transaction.type === "reservation_residence") {
    const sourceId = transaction.restaurantOrderId ?? transaction.residenceReservationId;
    if (!sourceId) throw new ProviderPaymentError("NOT_PAYABLE", "Transaction financière invalide.");
    const [commission, providerAccount, order] = await Promise.all([
      db.query.commissions.findFirst({
        where: transaction.type === "commande_restaurant"
          ? eq(commissions.commandeId, sourceId)
          : eq(commissions.residenceReservationId, sourceId),
      }),
      db.query.paymentProviderAccounts.findFirst({ where: and(
        eq(paymentProviderAccounts.partnerAccountId, transaction.partnerAccountId),
        eq(paymentProviderAccounts.provider, "paystack"),
        eq(paymentProviderAccounts.status, "active"),
      ) }),
      transaction.type === "commande_restaurant"
        ? db.query.commandes.findFirst({ where: eq(commandes.id, sourceId), columns: { statut: true } })
        : db.query.residenceReservations.findFirst({ where: eq(residenceReservations.id, sourceId), columns: { status: true } }),
    ]);
    const sourcePending = transaction.type === "commande_restaurant"
      ? order && "statut" in order && order.statut === "en_attente_paiement"
      : order && "status" in order && order.status === "en_attente_paiement";
    if (!commission || commission.collectionMode !== "provider_split" || !sourcePending || !providerAccount) {
      throw new ProviderPaymentError("NOT_PAYABLE", "Paiement électronique non disponible.");
    }
    split = {
      providerAccountReference: providerAccount.providerAccountReference,
      platformChargeFcfa: commission.amountFcfa + (payment.recoverySettlement?.montantFcfa ?? 0),
      feeBearer: "account",
    };
  }

  try {
    const initialized = await gateway.initialize({
      amountFcfa: payment.amountFcfa,
      currency: "XOF",
      email,
      reference: payment.providerReference,
      callbackUrl: `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/api/payments/paystack/callback`,
      method: payment.method as Extract<PaymentMethod, "mobile_money" | "card">,
      metadata: {
        paymentId: payment.id,
        transactionId: transaction.id,
        purpose: transaction.type,
      },
      split,
    });
    if (initialized.reference !== payment.providerReference) {
      throw new ProviderPaymentError("PROVIDER_MISMATCH", "Paystack a retourné une autre référence.");
    }
    const [saved] = await transactionalDb.update(payments).set({
      checkoutUrl: initialized.authorizationUrl,
      returnChannel,
      updatedAt: new Date(),
    }).where(and(eq(payments.id, payment.id), eq(payments.status, "pending"))).returning({ id: payments.id });
    if (!saved) throw new ProviderPaymentError("INITIALIZATION_CONFLICT", "Le paiement a changé pendant l’initialisation.");
    return initialized;
  } catch (error) {
    if (error instanceof PaystackGatewayError && error.definitive) {
      await transactionalDb.transaction(async (tx) => {
        await failPaymentInTransaction(tx, payment.id);
        if (payment.recoverySettlementId) {
          await releaseReservedSettlementInTransaction(tx, payment.recoverySettlementId);
        }
        if (transaction.type === "commission_settlement" && transaction.commissionSettlementId) {
          await releaseReservedSettlementInTransaction(tx, transaction.commissionSettlementId);
        }
      });
    }
    throw error;
  }
}

export async function verifyAndFinalizePaystackPayment(
  reference: string,
  gateway: PaymentGateway = new PaystackGateway(),
  effects: ProviderPaymentEffects = {},
) {
  const verified = await gateway.verify(reference);
  return confirmProviderPayment(verified, effects);
}

export async function retryRestaurantOrderPaystackPayment(input: {
  orderId: string;
  clientId: string;
  method: "mobile_money" | "card";
  returnChannel?: PaymentReturnChannel;
}) {
  const prepared = await transactionalDb.transaction(async (tx) => {
    const transaction = await tx.query.financialTransactions.findFirst({
      where: and(
        eq(financialTransactions.type, "commande_restaurant"),
        eq(financialTransactions.restaurantOrderId, input.orderId),
        eq(financialTransactions.clientId, input.clientId),
      ),
      with: { payments: true },
    });
    if (!transaction) throw new ProviderPaymentError("PAYMENT_NOT_FOUND", "Commande introuvable.");
    await tx.execute(sql`SELECT id FROM ${partnerAccounts} WHERE id = ${transaction.partnerAccountId} FOR UPDATE`);
    const order = await tx.query.commandes.findFirst({ where: eq(commandes.id, input.orderId) });
    if (transaction.status !== "pending" || order?.statut !== "en_attente_paiement") {
      throw new ProviderPaymentError("NOT_PAYABLE", "Cette commande n’attend plus de paiement.");
    }
    const pending = transaction.payments.find((payment) => payment.provider === "paystack" && payment.status === "pending");
    if (pending) {
      if (!pending.checkoutUrl) {
        throw new ProviderPaymentError("INITIALIZATION_CONFLICT", "Une tentative Paystack est encore en cours de vérification.");
      }
      return pending;
    }
    const commission = await tx.query.commissions.findFirst({
      where: eq(commissions.commandeId, order.id),
    });
    const providerAccount = await tx.query.paymentProviderAccounts.findFirst({
      where: and(
        eq(paymentProviderAccounts.partnerAccountId, transaction.partnerAccountId),
        eq(paymentProviderAccounts.provider, "paystack"),
        eq(paymentProviderAccounts.status, "active"),
      ),
    });
    if (!commission || commission.collectionMode !== "provider_split" || !providerAccount) {
      throw new ProviderPaymentError("NOT_PAYABLE", "Paiement électronique indisponible.");
    }
    const providerReference = `toutci-order-${crypto.randomUUID()}`;
    const recovery = await reserveOrderRecoveryInTransaction(tx, {
      partnerAccountId: transaction.partnerAccountId,
      normalPartnerNetFcfa: order.total - commission.amountFcfa,
      reservationReference: `recovery-${providerReference}`,
    });
    return createPaymentAttemptInTransaction(tx, {
      transactionId: transaction.id,
      amountFcfa: transaction.amountFcfa,
      method: input.method,
      provider: "paystack",
      providerReference,
      recoverySettlementId: recovery?.id ?? null,
      idempotencyKey: `commande-paystack:${order.id}:${transaction.payments.length + 1}`,
    });
  });
  return initializePreparedPaystackPayment({
    paymentId: prepared.id,
    owner: { clientId: input.clientId },
    returnChannel: input.returnChannel,
  });
}

export async function retrySubscriptionPaystackPayment(input: {
  requestId: string;
  partnerAccountId: string;
}) {
  const prepared = await transactionalDb.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM ${partnerAccounts} WHERE id = ${input.partnerAccountId} FOR UPDATE`);
    const transaction = await tx.query.financialTransactions.findFirst({
      where: and(
        eq(financialTransactions.type, "abonnement_partenaire"),
        eq(financialTransactions.subscriptionRequestId, input.requestId),
        eq(financialTransactions.partnerAccountId, input.partnerAccountId),
      ),
      with: { payments: true, subscriptionRequest: true },
    });
    if (!transaction || transaction.status !== "pending" || transaction.subscriptionRequest?.statut !== "en_attente") {
      throw new ProviderPaymentError("NOT_PAYABLE", "Cet abonnement n’attend plus de paiement.");
    }
    const pending = transaction.payments.find((payment) => payment.provider === "paystack" && payment.status === "pending");
    if (pending) {
      if (!pending.checkoutUrl) throw new ProviderPaymentError("INITIALIZATION_CONFLICT", "Une tentative Paystack est encore en cours de vérification.");
      return pending;
    }
    return createPaymentAttemptInTransaction(tx, {
      transactionId: transaction.id,
      amountFcfa: transaction.amountFcfa,
      method: "mobile_money",
      provider: "paystack",
      providerReference: `toutci-subscription-${crypto.randomUUID()}`,
      idempotencyKey: `subscription-paystack:${input.requestId}:${transaction.payments.length + 1}`,
    });
  });
  return initializePreparedPaystackPayment({
    paymentId: prepared.id,
    owner: { partnerAccountId: input.partnerAccountId },
  });
}

export async function retryResidencePaystackPayment(input: {
  reservationId: string;
  clientId: string;
  paymentMethod: "mobile_money" | "card";
  returnChannel?: PaymentReturnChannel;
}) {
  const prepared = await transactionalDb.transaction(async (tx) => {
    const transaction = await tx.query.financialTransactions.findFirst({
      where: and(
        eq(financialTransactions.type, "reservation_residence"),
        eq(financialTransactions.residenceReservationId, input.reservationId),
        eq(financialTransactions.clientId, input.clientId),
      ),
      with: { payments: true, residenceReservation: true },
    });
    if (!transaction) {
      throw new ProviderPaymentError("PAYMENT_NOT_FOUND", "Réservation introuvable.");
    }
    await tx.execute(
      sql`SELECT id FROM ${partnerAccounts} WHERE id = ${transaction.partnerAccountId} FOR UPDATE`,
    );
    if (
      transaction.status !== "pending" ||
      transaction.residenceReservation?.status !== "en_attente_paiement"
    ) {
      throw new ProviderPaymentError(
        "NOT_PAYABLE",
        "Cette réservation n’attend plus de paiement.",
      );
    }
    const pending = transaction.payments.find(
      (payment) => payment.provider === "paystack" && payment.status === "pending",
    );
    if (pending) {
      if (!pending.checkoutUrl) {
        throw new ProviderPaymentError(
          "INITIALIZATION_CONFLICT",
          "Une tentative Paystack est encore en cours de vérification.",
        );
      }
      return pending;
    }
    const commission = await tx.query.commissions.findFirst({
      where: eq(commissions.residenceReservationId, input.reservationId),
    });
    const providerAccount = await tx.query.paymentProviderAccounts.findFirst({
      where: and(
        eq(paymentProviderAccounts.partnerAccountId, transaction.partnerAccountId),
        eq(paymentProviderAccounts.provider, "paystack"),
        eq(paymentProviderAccounts.status, "active"),
      ),
    });
    if (!commission || commission.collectionMode !== "provider_split" || !providerAccount) {
      throw new ProviderPaymentError(
        "NOT_PAYABLE",
        "Le paiement en ligne de cette résidence est indisponible.",
      );
    }
    return createPaymentAttemptInTransaction(tx, {
      transactionId: transaction.id,
      amountFcfa: transaction.amountFcfa,
      method: input.paymentMethod,
      provider: "paystack",
      providerReference: `toutci-residence-${crypto.randomUUID()}`,
      idempotencyKey: `residence:${input.reservationId}:${transaction.payments.length + 1}`,
    });
  });
  return initializePreparedPaystackPayment({
    paymentId: prepared.id,
    owner: { clientId: input.clientId },
    returnChannel: input.returnChannel,
  });
}

export async function confirmProviderPayment(
  verified: VerifiedGatewayPayment,
  effects: ProviderPaymentEffects = {},
) {
  const candidate = await db.query.payments.findFirst({
    where: and(eq(payments.provider, "paystack"), eq(payments.providerReference, verified.reference)),
    with: { transaction: true },
  });
  if (!candidate) {
    console.error("[paystack] Référence inconnue", { reference: verified.reference });
    throw new ProviderPaymentError("PAYMENT_NOT_FOUND", "Référence Paystack inconnue.");
  }
  if (verified.reference !== candidate.providerReference) throw new ProviderPaymentError("PROVIDER_MISMATCH", "Référence Paystack incohérente.");
  if (verified.amountFcfa !== candidate.amountFcfa) {
    console.error("[paystack] Montant incohérent", { reference: verified.reference });
    throw new ProviderPaymentError("AMOUNT_MISMATCH", "Montant Paystack incohérent.");
  }
  if (verified.currency !== "XOF") {
    console.error("[paystack] Devise incohérente", { reference: verified.reference, currency: verified.currency });
    throw new ProviderPaymentError("CURRENCY_MISMATCH", "Devise Paystack incohérente.");
  }
  if (verified.status === "pending") return { status: "pending" as const, alreadyConfirmed: false };
  if (verified.status === "reversed") {
    console.error("[paystack] Transaction reversed à traiter manuellement", { reference: verified.reference });
    return { status: "reversed" as const, alreadyConfirmed: false };
  }
  if (verified.status === "failed") {
    await transactionalDb.transaction(async (tx) => {
      const current = await tx.query.payments.findFirst({ where: eq(payments.id, candidate.id) });
      if (current?.status !== "pending") return;
      await failPaymentInTransaction(tx, candidate.id);
      if (candidate.recoverySettlementId) await releaseReservedSettlementInTransaction(tx, candidate.recoverySettlementId);
      if (candidate.transaction.type === "commission_settlement" && candidate.transaction.commissionSettlementId) {
        await releaseReservedSettlementInTransaction(tx, candidate.transaction.commissionSettlementId);
      }
    });
    return { status: "failed" as const, alreadyConfirmed: false };
  }

  return transactionalDb.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM ${partnerAccounts} WHERE id = ${candidate.transaction.partnerAccountId} FOR UPDATE`);
    const confirmation = await confirmPaymentInTransaction(tx, { paymentId: candidate.id });
    if (confirmation.alreadyConfirmed) return { status: "confirmed" as const, alreadyConfirmed: true };
    if (verified.network) {
      await tx.update(payments).set({ network: verified.network, updatedAt: new Date() }).where(eq(payments.id, candidate.id));
    }
    const transaction = await tx.query.financialTransactions.findFirst({
      where: eq(financialTransactions.id, candidate.transactionId),
    });
    if (!transaction) throw new ProviderPaymentError("PAYMENT_NOT_FOUND", "Transaction introuvable.");
    if (transaction.type === "commande_restaurant") {
      const order = await releasePaidRestaurantOrderInTransaction(tx, transaction.restaurantOrderId!);
      if (!order) throw new ProviderPaymentError("NOT_PAYABLE", "La commande n’est plus payable.");
      if (candidate.recoverySettlementId) {
        await confirmReservedSettlementInTransaction(tx, candidate.recoverySettlementId);
      }
    } else if (transaction.type === "abonnement_partenaire") {
      await activatePaidSubscriptionInTransaction(tx, {
        requestId: transaction.subscriptionRequestId!,
        providerReference: verified.reference,
        paymentMethod: candidate.method === "card" ? "card" : "mobile_money",
      });
    } else if (transaction.type === "commission_settlement") {
      await confirmReservedSettlementInTransaction(tx, transaction.commissionSettlementId!);
    } else {
      if (!effects.confirmResidenceReservationInTransaction) {
        throw new ProviderPaymentError(
          "NOT_PAYABLE",
          "L’effet de confirmation Résidence est indisponible.",
        );
      }
      await effects.confirmResidenceReservationInTransaction(
        tx,
        transaction.residenceReservationId!,
      );
    }
    return {
      status: "confirmed" as const,
      alreadyConfirmed: false,
      transactionType: transaction.type,
      sourceId:
        transaction.restaurantOrderId ??
        transaction.subscriptionRequestId ??
        transaction.commissionSettlementId ??
        transaction.residenceReservationId!,
    };
  });
}

export async function getPaymentCallbackContext(
  reference: string,
): Promise<PaymentCallbackContext | null> {
  const payment = await db.query.payments.findFirst({
    where: and(eq(payments.provider, "paystack"), eq(payments.providerReference, reference)),
    with: { transaction: { with: { partnerAccount: true } } },
  });
  if (!payment) return null;
  if (payment.transaction.type === "commande_restaurant") {
    return {
      returnChannel: payment.returnChannel,
      transactionType: payment.transaction.type,
      sourceId: payment.transaction.restaurantOrderId!,
      webDestination: `/commandes/${payment.transaction.restaurantOrderId}`,
    };
  }
  if (payment.transaction.type === "reservation_residence") {
    return {
      returnChannel: payment.returnChannel,
      transactionType: payment.transaction.type,
      sourceId: payment.transaction.residenceReservationId!,
      webDestination: `/reservations/${payment.transaction.residenceReservationId}`,
    };
  }
  if (
    payment.transaction.type === "abonnement_partenaire" &&
    payment.transaction.partnerAccount.activityType === "residence"
  ) {
    return {
      returnChannel: payment.returnChannel,
      transactionType: payment.transaction.type,
      sourceId: payment.transaction.subscriptionRequestId!,
      webDestination: "/partenaire/facturation",
    };
  }
  return {
    returnChannel: payment.returnChannel,
    transactionType: payment.transaction.type,
    sourceId:
      payment.transaction.subscriptionRequestId ??
      payment.transaction.commissionSettlementId!,
    webDestination: "/restaurateur/facturation",
  };
}
