import "server-only";

import { and, eq } from "drizzle-orm";
import { commissions } from "@/lib/db/schema";
import type { TransactionExecutor } from "@/lib/db/transaction";
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
