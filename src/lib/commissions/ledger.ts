import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { after } from "next/server";
import { db } from "@/lib/db";
import { transactionalDb } from "@/lib/db/transaction";
import {
  commissionDebtCycles,
  commissionPolicySettings,
  commissions,
  commissionSettlementAllocations,
  commissionSettlements,
  partnerAccounts,
  restaurants,
} from "@/lib/db/schema";
import { calculerCommissionFcfa } from "@/lib/money";
import { calculateArrearsRecovery, resolveCashAccess } from "./policy";
import { sendNotification } from "@/lib/notifications";
import { getCommissionRateBps } from "@/lib/subscription-plans";
import { persistAuditLog } from "@/lib/audit";
import {
  createPaymentAttemptInTransaction,
  createTransactionInTransaction,
  recordConfirmedOfflinePaymentInTransaction,
} from "@/modules/transactions/server";
import { mapOfflinePaymentMethod } from "@/modules/transactions/model";

type CommissionTx = Parameters<
  Parameters<typeof transactionalDb.transaction>[0]
>[0];

export class CommissionLedgerError extends Error {
  constructor(
    public readonly code:
      | "CASH_NOT_ALLOWED"
      | "COMMISSION_NOT_FOUND"
      | "INVALID_SETTLEMENT"
      | "SETTLEMENT_EXCEEDS_DEBT"
      | "SETTLEMENT_CONFLICT",
    message: string,
  ) {
    super(message);
    this.name = "CommissionLedgerError";
  }
}

export interface CommissionPolicyInput {
  cashDebtThresholdFcfa: number;
  cashGraceDays: number;
  cashDebtRecoveryMaxBps: number;
}

export function validateCommissionPolicy(
  input: CommissionPolicyInput,
): CommissionPolicyInput {
  if (
    !Number.isSafeInteger(input.cashDebtThresholdFcfa) ||
    input.cashDebtThresholdFcfa < 0 ||
    !Number.isSafeInteger(input.cashGraceDays) ||
    input.cashGraceDays < 0 ||
    !Number.isInteger(input.cashDebtRecoveryMaxBps) ||
    input.cashDebtRecoveryMaxBps < 0 ||
    input.cashDebtRecoveryMaxBps > 5_000
  ) {
    throw new Error("Politique de commissions invalide");
  }
  return input;
}

async function getOutstandingDebtWith(
  database: Pick<CommissionTx, "select">,
  partnerAccountId: string,
) {
  const [row] = await database
    .select({
      amount: sql<number>`COALESCE(SUM(
        ${commissions.amountFcfa} - COALESCE((
          SELECT SUM(allocation.amount_fcfa)
          FROM commission_settlement_allocations allocation
          INNER JOIN commission_settlements settlement
            ON settlement.id = allocation.settlement_id
          WHERE allocation.commission_id = commissions.id
            AND settlement.statut = 'confirmed'
        ), 0)
      ), 0)`,
    })
    .from(commissions)
    .where(
      and(
        eq(commissions.partnerAccountId, partnerAccountId),
        eq(commissions.commercialStatus, "due"),
        eq(commissions.collectionMode, "cash_receivable"),
      ),
    );
  return Number(row?.amount ?? 0);
}

async function getPendingReservationsWith(
  database: Pick<CommissionTx, "select">,
  partnerAccountId: string,
) {
  const [row] = await database
    .select({ amount: sql<number>`COALESCE(SUM(${commissionSettlements.montantFcfa}), 0)` })
    .from(commissionSettlements)
    .where(
      and(
        eq(commissionSettlements.partnerAccountId, partnerAccountId),
        eq(commissionSettlements.statut, "pending"),
      ),
    );
  return Number(row?.amount ?? 0);
}

export async function getAvailableCashCommissionDebt(partnerAccountId: string) {
  const [outstanding, reserved] = await Promise.all([
    getOutstandingDebtWith(db, partnerAccountId),
    getPendingReservationsWith(db, partnerAccountId),
  ]);
  return Math.max(0, outstanding - reserved);
}

async function getAvailableDebtInTransaction(tx: CommissionTx, partnerAccountId: string) {
  const outstanding = await getOutstandingDebtWith(tx, partnerAccountId);
  const reserved = await getPendingReservationsWith(tx, partnerAccountId);
  return { outstanding, reserved, available: Math.max(0, outstanding - reserved) };
}

export async function reserveOrderRecoveryInTransaction(
  tx: CommissionTx,
  input: {
    partnerAccountId: string;
    normalPartnerNetFcfa: number;
    reservationReference: string;
    now?: Date;
  },
) {
  const now = input.now ?? new Date();
  const debt = await getAvailableDebtInTransaction(tx, input.partnerAccountId);
  const policy = await getPolicyWith(tx);
  const amountFcfa = calculateArrearsRecovery({
    normalPartnerNetFcfa: input.normalPartnerNetFcfa,
    availableDebtFcfa: debt.available,
    recoveryBps: policy.cashDebtRecoveryMaxBps,
  });
  if (amountFcfa <= 0) return null;

  const [settlement] = await tx
    .insert(commissionSettlements)
    .values({
      partnerAccountId: input.partnerAccountId,
      source: "provider_recovery",
      statut: "pending",
      montantFcfa: amountFcfa,
      moyenReglement: null,
      referenceExterne: input.reservationReference,
      justification: "Réservation automatique sur paiement électronique Restaurant",
      paidAt: null,
      confirmedAt: null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  if (!settlement) throw new CommissionLedgerError("SETTLEMENT_CONFLICT", "Réservation impossible.");
  return settlement;
}

export async function createPaystackSettlementInTransaction(
  tx: CommissionTx,
  input: { partnerAccountId: string; amountFcfa: number; reference: string; now?: Date },
) {
  if (!Number.isSafeInteger(input.amountFcfa) || input.amountFcfa <= 0) {
    throw new CommissionLedgerError("INVALID_SETTLEMENT", "Montant invalide.");
  }
  const debt = await getAvailableDebtInTransaction(tx, input.partnerAccountId);
  if (input.amountFcfa > debt.available) {
    throw new CommissionLedgerError(
      "SETTLEMENT_EXCEEDS_DEBT",
      "Le règlement dépasse la dette disponible.",
    );
  }
  const now = input.now ?? new Date();
  const [settlement] = await tx.insert(commissionSettlements).values({
    partnerAccountId: input.partnerAccountId,
    source: "paystack_direct",
    statut: "pending",
    montantFcfa: input.amountFcfa,
    moyenReglement: null,
    referenceExterne: input.reference,
    justification: "Règlement Paystack initié par le partenaire",
    paidAt: null,
    confirmedAt: null,
    createdAt: now,
    updatedAt: now,
  }).returning();
  if (!settlement) throw new CommissionLedgerError("SETTLEMENT_CONFLICT", "Règlement impossible.");
  return settlement;
}

export async function confirmReservedSettlementInTransaction(
  tx: CommissionTx,
  settlementId: string,
  now = new Date(),
) {
  const settlement = await tx.query.commissionSettlements.findFirst({
    where: eq(commissionSettlements.id, settlementId),
  });
  if (!settlement) throw new CommissionLedgerError("INVALID_SETTLEMENT", "Règlement introuvable.");
  if (settlement.statut === "confirmed") return { settlement, alreadyConfirmed: true };
  if (settlement.statut !== "pending") {
    throw new CommissionLedgerError("SETTLEMENT_CONFLICT", "Réservation non confirmable.");
  }
  const dueRows = await tx
    .select({
      id: commissions.id,
      amountFcfa: commissions.amountFcfa,
      allocated: sql<number>`COALESCE((SELECT SUM(a.amount_fcfa) FROM commission_settlement_allocations a INNER JOIN commission_settlements s ON s.id = a.settlement_id WHERE a.commission_id = commissions.id AND s.statut = 'confirmed'), 0)`,
    })
    .from(commissions)
    .where(and(
      eq(commissions.partnerAccountId, settlement.partnerAccountId),
      eq(commissions.commercialStatus, "due"),
      eq(commissions.collectionMode, "cash_receivable"),
    ))
    .orderBy(asc(commissions.dueAt), asc(commissions.createdAt), asc(commissions.id));
  let remaining = settlement.montantFcfa;
  const allocations: Array<{ commissionId: string; amountFcfa: number }> = [];
  for (const row of dueRows) {
    if (remaining === 0) break;
    const amountFcfa = Math.min(Math.max(0, row.amountFcfa - Number(row.allocated)), remaining);
    if (amountFcfa > 0) {
      allocations.push({ commissionId: row.id, amountFcfa });
      remaining -= amountFcfa;
    }
  }
  if (remaining !== 0) {
    throw new CommissionLedgerError("SETTLEMENT_CONFLICT", "La dette ne couvre plus la réservation.");
  }
  const [confirmed] = await tx.update(commissionSettlements).set({
    statut: "confirmed",
    paidAt: now,
    confirmedAt: now,
    updatedAt: now,
  }).where(and(
    eq(commissionSettlements.id, settlement.id),
    eq(commissionSettlements.statut, "pending"),
  )).returning();
  if (!confirmed) throw new CommissionLedgerError("SETTLEMENT_CONFLICT", "Confirmation concurrente.");
  if (allocations.length > 0) {
    await tx.insert(commissionSettlementAllocations).values(
      allocations.map((allocation) => ({ settlementId: settlement.id, ...allocation })),
    );
  }
  await reconcileDebtCycle(tx, settlement.partnerAccountId, now);
  return { settlement: confirmed, allocations, alreadyConfirmed: false };
}

export async function releaseReservedSettlementInTransaction(
  tx: CommissionTx,
  settlementId: string,
  now = new Date(),
) {
  const [released] = await tx.update(commissionSettlements).set({
    statut: "failed",
    updatedAt: now,
  }).where(and(
    eq(commissionSettlements.id, settlementId),
    eq(commissionSettlements.statut, "pending"),
  )).returning();
  return released ?? null;
}

export async function releaseOrderRecoveryReservationsInTransaction(
  tx: CommissionTx,
  orderId: string,
  now = new Date(),
) {
  const rows = await tx.execute(sql`
    SELECT p.recovery_settlement_id
    FROM payments p
    INNER JOIN transactions t ON t.id = p.transaction_id
    WHERE t.restaurant_order_id = ${orderId}
      AND p.recovery_settlement_id IS NOT NULL
  `);
  for (const row of rows.rows as Array<{ recovery_settlement_id: string }>) {
    await releaseReservedSettlementInTransaction(tx, row.recovery_settlement_id, now);
  }
}

export async function getOutstandingCashCommissionDebt(
  partnerAccountId: string,
) {
  return getOutstandingDebtWith(db, partnerAccountId);
}

async function getPolicyWith(database: Pick<CommissionTx, "query">) {
  const policy = await database.query.commissionPolicySettings.findFirst({
    where: eq(commissionPolicySettings.id, 1),
  });
  if (!policy) throw new Error("Politique de commissions absente");
  return policy;
}

export async function getEffectiveCommissionRateSnapshot(
  tx: CommissionTx,
  partnerAccountId: string,
  now = new Date(),
) {
  return getCommissionRateBps(partnerAccountId, { executor: tx, now });
}

export async function createCommissionSnapshot(
  tx: CommissionTx,
  input: {
    orderId: string;
    partnerAccountId: string;
    baseAmountFcfa: number;
    collectionMode: "cash_receivable" | "provider_split";
    now?: Date;
  },
) {
  const rateBpsSnapshot = await getEffectiveCommissionRateSnapshot(
    tx,
    input.partnerAccountId,
    input.now,
  );
  const amountFcfa = calculerCommissionFcfa(
    input.baseAmountFcfa,
    rateBpsSnapshot,
  );
  const [commission] = await tx
    .insert(commissions)
    .values({
      commandeId: input.orderId,
      partnerAccountId: input.partnerAccountId,
      baseAmountFcfa: input.baseAmountFcfa,
      rateBpsSnapshot,
      amountFcfa,
      commercialStatus: "pending",
      collectionMode: input.collectionMode,
    })
    .returning();
  if (!commission) throw new Error("Snapshot de commission impossible");
  return commission;
}

async function reconcileDebtCycle(
  tx: CommissionTx,
  partnerAccountId: string,
  now: Date,
) {
  const debt = await getOutstandingDebtWith(tx, partnerAccountId);
  const activeCycle = await tx.query.commissionDebtCycles.findFirst({
    where: and(
      eq(commissionDebtCycles.partnerAccountId, partnerAccountId),
      isNull(commissionDebtCycles.closedAt),
    ),
  });

  if (debt === 0 && activeCycle) {
    await tx
      .update(commissionDebtCycles)
      .set({ closedAt: now, updatedAt: now })
      .where(eq(commissionDebtCycles.id, activeCycle.id));
    return { debt, cycle: null, notificationNeeded: false };
  }
  if (activeCycle) {
    return {
      debt,
      cycle: activeCycle,
      notificationNeeded: activeCycle.notifiedAt === null,
    };
  }

  const policy = await getPolicyWith(tx);
  if (debt < policy.cashDebtThresholdFcfa) {
    return { debt, cycle: null, notificationNeeded: false };
  }
  const [cycle] = await tx
    .insert(commissionDebtCycles)
    .values({
      partnerAccountId,
      thresholdSnapshotFcfa: policy.cashDebtThresholdFcfa,
      graceDaysSnapshot: policy.cashGraceDays,
      triggeredAt: now,
    })
    .onConflictDoNothing()
    .returning();
  const resolvedCycle =
    cycle ??
    (await tx.query.commissionDebtCycles.findFirst({
      where: and(
        eq(commissionDebtCycles.partnerAccountId, partnerAccountId),
        isNull(commissionDebtCycles.closedAt),
      ),
    }));
  return {
    debt,
    cycle: resolvedCycle ?? null,
    notificationNeeded: resolvedCycle?.notifiedAt === null,
  };
}

export async function transitionCommissionForOrder(
  tx: CommissionTx,
  orderId: string,
  orderStatus: "servie" | "annulee",
  now: Date,
) {
  const targetStatus = orderStatus === "servie" ? "due" : "void";
  const candidate = await tx.query.commissions.findFirst({
    where: eq(commissions.commandeId, orderId),
    columns: { partnerAccountId: true },
  });
  if (!candidate) {
    throw new CommissionLedgerError(
      "COMMISSION_NOT_FOUND",
      "Snapshot de commission introuvable.",
    );
  }
  await tx.execute(
    sql`SELECT id FROM ${partnerAccounts} WHERE id = ${candidate.partnerAccountId} FOR UPDATE`,
  );
  const [commission] = await tx
    .update(commissions)
    .set({
      commercialStatus: targetStatus,
      dueAt: targetStatus === "due" ? now : null,
      voidedAt: targetStatus === "void" ? now : null,
      updatedAt: now,
    })
    .where(
      and(
        eq(commissions.commandeId, orderId),
        eq(commissions.commercialStatus, "pending"),
      ),
    )
    .returning();
  if (!commission) {
    const existing = await tx.query.commissions.findFirst({
      where: eq(commissions.commandeId, orderId),
    });
    if (!existing) throw new CommissionLedgerError("COMMISSION_NOT_FOUND", "Snapshot de commission introuvable.");
    return { commission: existing, cycleResult: null };
  }
  if (
    targetStatus === "due" &&
    commission.collectionMode === "cash_receivable"
  ) {
    return {
      commission,
      cycleResult: await reconcileDebtCycle(
        tx,
        commission.partnerAccountId,
        now,
      ),
    };
  }
  return { commission, cycleResult: null };
}

export async function getCashCommissionStatus(
  partnerAccountId: string,
  now = new Date(),
) {
  const [outstandingDebt, policy, cycle] = await Promise.all([
    getOutstandingCashCommissionDebt(partnerAccountId),
    db.query.commissionPolicySettings.findFirst({
      where: eq(commissionPolicySettings.id, 1),
    }),
    db.query.commissionDebtCycles.findFirst({
      where: and(
        eq(commissionDebtCycles.partnerAccountId, partnerAccountId),
        isNull(commissionDebtCycles.closedAt),
      ),
    }),
  ]);
  if (!policy) throw new Error("Politique de commissions absente");
  const access = resolveCashAccess({ outstandingDebtFcfa: outstandingDebt, cycle: cycle ?? null, now });
  return {
    outstandingDebt,
    threshold: cycle?.thresholdSnapshotFcfa ?? policy.cashDebtThresholdFcfa,
    cycleTriggeredAt: cycle?.triggeredAt ?? null,
    ...access,
    cycle: cycle ?? null,
    policy,
  };
}

export async function getCashCommissionStatusInTransaction(
  tx: CommissionTx,
  partnerAccountId: string,
  now = new Date(),
) {
  const [outstandingDebt, policy, cycle] = await Promise.all([
    getOutstandingDebtWith(tx, partnerAccountId),
    getPolicyWith(tx),
    tx.query.commissionDebtCycles.findFirst({
      where: and(
        eq(commissionDebtCycles.partnerAccountId, partnerAccountId),
        isNull(commissionDebtCycles.closedAt),
      ),
    }),
  ]);
  const access = resolveCashAccess({ outstandingDebtFcfa: outstandingDebt, cycle: cycle ?? null, now });
  return { outstandingDebt, policy, cycle: cycle ?? null, ...access };
}

export function scheduleDebtCycleNotification(input: {
  partnerAccountId: string;
  cycleId: string;
  debtFcfa: number;
}) {
  after(async () => {
    const [claimed] = await db
      .update(commissionDebtCycles)
      .set({ notifiedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(commissionDebtCycles.id, input.cycleId),
          isNull(commissionDebtCycles.notifiedAt),
        ),
      )
      .returning({ id: commissionDebtCycles.id });
    if (!claimed) return;
    const [account, restaurant] = await Promise.all([
      db.query.partnerAccounts.findFirst({
        where: eq(partnerAccounts.id, input.partnerAccountId),
        columns: { userId: true },
      }),
      db.query.restaurants.findFirst({
        where: eq(restaurants.partnerAccountId, input.partnerAccountId),
        columns: { id: true },
      }),
    ]);
    if (!account || !restaurant) return;
    await sendNotification({
      userId: account.userId,
      restaurantId: restaurant.id,
      type: "commission_cash_threshold",
      titre: "Seuil de commissions cash atteint",
      message: `Votre solde de commissions cash à régler est de ${input.debtFcfa.toLocaleString("fr-FR")} FCFA. Consultez votre espace de facturation pour connaître le délai de régularisation.`,
      lienType: "commission",
      lienId: input.cycleId,
      data: { cycleId: input.cycleId },
    });
  });
}

export async function createManualCommissionSettlement(input: {
  partnerAccountId: string;
  adminId: string;
  amountFcfa: number;
  method: "mobile_money" | "virement" | "especes" | "cheque";
  externalReference: string;
  justification: string;
  paidAt: Date;
}) {
  if (!Number.isSafeInteger(input.amountFcfa) || input.amountFcfa <= 0) {
    throw new CommissionLedgerError("INVALID_SETTLEMENT", "Montant invalide.");
  }
  const reference = input.externalReference.trim();
  const justification = input.justification.trim();
  if (reference.length < 3 || reference.length > 255 || justification.length < 10 || justification.length > 1_000) {
    throw new CommissionLedgerError(
      "INVALID_SETTLEMENT",
      "La référence ou la justification du règlement est invalide.",
    );
  }

  try {
    return await transactionalDb.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT id FROM ${partnerAccounts} WHERE id = ${input.partnerAccountId} FOR UPDATE`,
      );
      const debt = await getOutstandingDebtWith(tx, input.partnerAccountId);
      if (input.amountFcfa > debt) {
        throw new CommissionLedgerError(
          "SETTLEMENT_EXCEEDS_DEBT",
          "Le règlement dépasse la dette cash actuelle.",
        );
      }

      const dueRows = await tx
        .select({
          id: commissions.id,
          amountFcfa: commissions.amountFcfa,
          allocated: sql<number>`COALESCE((
            SELECT SUM(allocation.amount_fcfa)
            FROM commission_settlement_allocations allocation
            INNER JOIN commission_settlements settlement
              ON settlement.id = allocation.settlement_id
            WHERE allocation.commission_id = commissions.id
              AND settlement.statut = 'confirmed'
          ), 0)`,
        })
        .from(commissions)
        .where(
          and(
            eq(commissions.partnerAccountId, input.partnerAccountId),
            eq(commissions.commercialStatus, "due"),
            eq(commissions.collectionMode, "cash_receivable"),
          ),
        )
        .orderBy(
          asc(commissions.dueAt),
          asc(commissions.createdAt),
          asc(commissions.id),
        );

      const [settlement] = await tx
        .insert(commissionSettlements)
        .values({
          partnerAccountId: input.partnerAccountId,
          adminId: input.adminId,
          source: "manual_admin",
          statut: "pending",
          montantFcfa: input.amountFcfa,
          moyenReglement: input.method,
          referenceExterne: reference,
          justification,
          paidAt: input.paidAt,
          confirmedAt: null,
        })
        .returning();
      if (!settlement) {
        throw new CommissionLedgerError(
          "INVALID_SETTLEMENT",
          "Le règlement n’a pas pu être créé.",
        );
      }

      const financialTransaction = await createTransactionInTransaction(tx, {
        type: "commission_settlement",
        commissionSettlementId: settlement.id,
        partnerAccountId: input.partnerAccountId,
        amountFcfa: input.amountFcfa,
      });
      const financialPayment = await recordConfirmedOfflinePaymentInTransaction(tx, {
        transactionId: financialTransaction.id,
        amountFcfa: input.amountFcfa,
        method: mapOfflinePaymentMethod(input.method),
        provider: null,
        idempotencyKey: `commission-admin:${settlement.id}`,
        confirmedByAdminId: input.adminId,
        now: input.paidAt,
      });

      let remaining = input.amountFcfa;
      const allocations: Array<{ commissionId: string; amountFcfa: number }> = [];
      for (const row of dueRows) {
        if (remaining === 0) break;
        const outstanding = row.amountFcfa - Number(row.allocated);
        if (outstanding <= 0) continue;
        const amountFcfa = Math.min(outstanding, remaining);
        allocations.push({ commissionId: row.id, amountFcfa });
        remaining -= amountFcfa;
      }
      if (remaining !== 0) {
        throw new CommissionLedgerError(
          "INVALID_SETTLEMENT",
          "Le règlement n’a pas pu être entièrement alloué.",
        );
      }
      const confirmedAt = new Date();
      const [confirmedSettlement] = await tx
        .update(commissionSettlements)
        .set({ statut: "confirmed", confirmedAt, updatedAt: confirmedAt })
        .where(
          and(
            eq(commissionSettlements.id, settlement.id),
            eq(commissionSettlements.statut, "pending"),
          ),
        )
        .returning();
      if (!confirmedSettlement) {
        throw new CommissionLedgerError(
          "SETTLEMENT_CONFLICT",
          "Le règlement a déjà été traité.",
        );
      }
      await tx.insert(commissionSettlementAllocations).values(
        allocations.map((allocation) => ({
          settlementId: settlement.id,
          ...allocation,
        })),
      );
      const cycleResult = await reconcileDebtCycle(
        tx,
        input.partnerAccountId,
        new Date(),
      );
      await persistAuditLog(tx, {
        adminId: input.adminId,
        action: "commissions_encaissees",
        ressourceType: "commission",
        ressourceId: input.partnerAccountId,
        details: {
          source: "manual_admin",
          settlementId: settlement.id,
          transactionId: financialTransaction.id,
          paymentId: financialPayment.payment.id,
          amountFcfa: input.amountFcfa,
          method: input.method,
          externalReference: reference,
          justification,
          allocations,
        },
      });
      return {
        settlement: confirmedSettlement,
        allocations,
        remainingDebt: cycleResult.debt,
      };
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      throw new CommissionLedgerError(
        "SETTLEMENT_CONFLICT",
        "Cette référence de règlement a déjà été utilisée.",
      );
    }
    throw error;
  }
}

export async function preparePaystackCommissionSettlement(input: {
  partnerAccountId: string;
  amountFcfa: number;
}) {
  return transactionalDb.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM ${partnerAccounts} WHERE id = ${input.partnerAccountId} FOR UPDATE`);
    const providerReference = `toutci-commission-${crypto.randomUUID()}`;
    const settlement = await createPaystackSettlementInTransaction(tx, {
      partnerAccountId: input.partnerAccountId,
      amountFcfa: input.amountFcfa,
      reference: `settlement-${providerReference}`,
    });
    const transaction = await createTransactionInTransaction(tx, {
      type: "commission_settlement",
      commissionSettlementId: settlement.id,
      partnerAccountId: input.partnerAccountId,
      amountFcfa: input.amountFcfa,
    });
    const payment = await createPaymentAttemptInTransaction(tx, {
      transactionId: transaction.id,
      amountFcfa: input.amountFcfa,
      method: "mobile_money",
      provider: "paystack",
      providerReference,
      idempotencyKey: `commission-paystack:${settlement.id}:1`,
    });
    return { settlement, transaction, payment };
  });
}

export async function updateCommissionPolicy(input: {
  adminId: string;
  policy: CommissionPolicyInput;
}) {
  const policy = validateCommissionPolicy(input.policy);
  return transactionalDb.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM ${commissionPolicySettings} WHERE id = 1 FOR UPDATE`);
    const previous = await getPolicyWith(tx);
    const [updated] = await tx
      .update(commissionPolicySettings)
      .set({ ...policy, updatedAt: new Date() })
      .where(eq(commissionPolicySettings.id, 1))
      .returning();
    const accountsWithDebt = await tx
      .selectDistinct({ partnerAccountId: commissions.partnerAccountId })
      .from(commissions)
      .where(
        and(
          eq(commissions.commercialStatus, "due"),
          eq(commissions.collectionMode, "cash_receivable"),
        ),
      );
    const notificationCycles = [];
    for (const account of accountsWithDebt) {
      await tx.execute(
        sql`SELECT id FROM ${partnerAccounts} WHERE id = ${account.partnerAccountId} FOR UPDATE`,
      );
      const result = await reconcileDebtCycle(
        tx,
        account.partnerAccountId,
        new Date(),
      );
      if (result.notificationNeeded && result.cycle) {
        notificationCycles.push({
          partnerAccountId: account.partnerAccountId,
          cycleId: result.cycle.id,
          debtFcfa: result.debt,
        });
      }
    }
    await persistAuditLog(tx, {
      adminId: input.adminId,
      action: "politique_commission_modifiee",
      ressourceType: "commission_policy",
      ressourceId: "1",
      details: { oldValues: previous, newValues: updated },
    });
    return { policy: updated, notificationCycles };
  });
}

/**
 * Convertit une CommissionLedgerError en réponse métier HTTP.
 * Les adaptateurs (route handlers) l'utilisent pour ne jamais exposer un 500
 * sur des invariants métier connus (ex: commande sans snapshot de commission
 * créée hors du circuit standard).
 */
export function commissionLedgerHttpStatus(
  error: unknown,
): {
  status: 409 | 422;
  code:
    | "COMMISSION_SNAPSHOT_MANQUANT"
    | "CASH_NOT_ALLOWED"
    | "INVALID_SETTLEMENT"
    | "SETTLEMENT_EXCEEDS_DEBT"
    | "SETTLEMENT_CONFLICT";
  message: string;
} | null {
  if (!(error instanceof CommissionLedgerError)) return null;
  switch (error.code) {
    case "COMMISSION_NOT_FOUND":
      return {
        status: 409,
        code: "COMMISSION_SNAPSHOT_MANQUANT",
        message:
          "Cette commande ne peut pas être clôturée : aucune configuration de commission n'y est attachée. Recréez la commande via le parcours standard ou contactez le support.",
      };
    case "CASH_NOT_ALLOWED":
      return { status: 422, code: error.code, message: error.message };
    case "INVALID_SETTLEMENT":
    case "SETTLEMENT_EXCEEDS_DEBT":
    case "SETTLEMENT_CONFLICT":
      return { status: 422, code: error.code, message: error.message };
  }
}
