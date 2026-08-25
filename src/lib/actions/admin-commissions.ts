"use server";

import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/auth/get-admin-session";
import {
  createManualCommissionSettlement,
  scheduleDebtCycleNotification,
  updateCommissionPolicy,
} from "@/lib/commissions/ledger";

export async function createManualCommissionSettlementAction(
  input: {
    partnerAccountId: string;
    amountFcfa: number;
    method: "mobile_money" | "virement" | "especes" | "cheque";
    externalReference: string;
    justification: string;
    paidAt: string;
  },
) {
  const admin = await getAdminSession();
  const paidAt = new Date(input.paidAt);
  if (Number.isNaN(paidAt.getTime())) throw new Error("Date de règlement invalide.");
  const resultat = await createManualCommissionSettlement({
    partnerAccountId: input.partnerAccountId,
    adminId: admin.userId,
    amountFcfa: input.amountFcfa,
    method: input.method,
    externalReference: input.externalReference,
    justification: input.justification,
    paidAt,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/commissions");
  revalidatePath("/restaurateur/facturation");
  return { success: true, ...resultat };
}

export async function updateCommissionPolicyAction(input: {
  cashDebtThresholdFcfa: number;
  cashGraceDays: number;
  cashDebtRecoveryMaxBps: number;
}) {
  const admin = await getAdminSession();
  const result = await updateCommissionPolicy({ adminId: admin.userId, policy: input });
  for (const cycle of result.notificationCycles) {
    scheduleDebtCycleNotification(cycle);
  }
  revalidatePath("/admin/parametres");
  revalidatePath("/admin/commissions");
  revalidatePath("/restaurateur/facturation");
  return { success: true, policy: result.policy };
}
