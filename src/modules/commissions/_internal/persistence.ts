import "server-only";

import { and, eq } from "drizzle-orm";
import { commissions } from "@/infrastructure/db/schema";
import type { DbExecutor } from "@/infrastructure/db";
import { db } from "@/infrastructure/db";
import type { TransactionExecutor } from "@/infrastructure/db/transaction";
import type { CommissionSnapshot } from "../model";

export async function createResidenceCommissionRecord(
  tx: TransactionExecutor,
  input: {
    residenceReservationId: string;
    partnerAccountId: string;
    snapshot: CommissionSnapshot;
    now: Date;
  },
) {
  const [commission] = await tx
    .insert(commissions)
    .values({
      residenceReservationId: input.residenceReservationId,
      partnerAccountId: input.partnerAccountId,
      baseAmountFcfa: input.snapshot.baseAmountFcfa,
      rateBpsSnapshot: input.snapshot.rateBpsSnapshot,
      amountFcfa: input.snapshot.amountFcfa,
      commercialStatus: "pending",
      collectionMode: input.snapshot.collectionMode,
      createdAt: input.now,
      updatedAt: input.now,
    })
    .returning();
  return commission;
}

export async function voidPendingResidenceCommissionRecord(
  tx: TransactionExecutor,
  residenceReservationId: string,
  now: Date,
) {
  const [commission] = await tx
    .update(commissions)
    .set({ commercialStatus: "void", voidedAt: now, updatedAt: now })
    .where(
      and(
        eq(commissions.residenceReservationId, residenceReservationId),
        eq(commissions.commercialStatus, "pending"),
      ),
    )
    .returning();
  return commission ?? null;
}

export function getProviderSplitCommissionRecord(
  source:
    | { orderId: string; residenceReservationId?: never }
    | { orderId?: never; residenceReservationId: string },
  executor: DbExecutor = db,
) {
  return executor.query.commissions.findFirst({
    where: source.orderId !== undefined
      ? eq(commissions.commandeId, source.orderId)
      : eq(commissions.residenceReservationId, source.residenceReservationId),
    columns: {
      id: true,
      amountFcfa: true,
      collectionMode: true,
      partnerAccountId: true,
    },
  });
}
