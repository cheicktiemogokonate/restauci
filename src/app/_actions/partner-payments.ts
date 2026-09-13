"use server";

import { z } from "zod";
import { requirePartnerActivity } from "@/modules/partners/server";
import { preparePaystackCommissionSettlement } from "@/modules/commissions/server";
import { initializePreparedPaystackPayment } from "@/modules/payments/server";

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
