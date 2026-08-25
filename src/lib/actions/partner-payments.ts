"use server";

import { z } from "zod";
import { requirePartnerActivity } from "@/lib/auth/partner-account";
import { preparePaystackCommissionSettlement } from "@/lib/commissions/ledger";
import { initializePreparedPaystackPayment } from "@/modules/transactions/payment-service";

const amountSchema = z.coerce.number().int().positive().max(10_000_000);

export async function payCommissionDebtAction(amount: number) {
  const partner = await requirePartnerActivity("restaurant");
  const amountFcfa = amountSchema.parse(amount);
  const prepared = await preparePaystackCommissionSettlement({
    partnerAccountId: partner.id,
    amountFcfa,
  });
  const initialized = await initializePreparedPaystackPayment({
    paymentId: prepared.payment.id,
    owner: { partnerAccountId: partner.id },
  });
  return { authorizationUrl: initialized.authorizationUrl };
}
