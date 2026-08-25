"use server";

import { requirePartnerAccount } from "@/lib/auth/partner-account";
import { revalidatePath } from "next/cache";
import { subscriptionPlanCodeSchema } from "@/modules/subscriptions/contracts";
import { createPartnerSubscriptionRequest } from "@/modules/subscriptions/server";
import {
  initializePreparedPaystackPayment,
  retrySubscriptionPaystackPayment,
} from "@/modules/transactions/payment-service";

export async function createSubscriptionRequestAction(planCode: string) {
  const partnerAccount = await requirePartnerAccount();
  const validatedPlanCode = subscriptionPlanCodeSchema.parse(planCode);
  const prepared = await createPartnerSubscriptionRequest({
    partnerAccountId: partnerAccount.id,
    planCode: validatedPlanCode,
  });
  const payment = prepared.paymentId
    ? await initializePreparedPaystackPayment({
        paymentId: prepared.paymentId,
        owner: { partnerAccountId: partnerAccount.id },
      })
    : null;

  revalidatePath("/restaurateur/facturation");
  revalidatePath("/partenaire/facturation");
  return {
    success: true,
    requestId: prepared.requestId,
    authorizationUrl: payment?.authorizationUrl ?? null,
  };
}

export async function resumeSubscriptionPaymentAction(requestId: string) {
  const partnerAccount = await requirePartnerAccount();
  const result = await retrySubscriptionPaystackPayment({
    requestId,
    partnerAccountId: partnerAccount.id,
  });
  return { authorizationUrl: result.authorizationUrl };
}
