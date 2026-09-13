import { NextRequest, NextResponse } from "next/server";
import {
  getPaymentCallbackContext,
  verifyAndFinalizePaystackPayment,
} from "@/modules/payments/server";
import { schedulePaidRestaurantOrderEffects } from "@/modules/orders/server";
import {
  confirmResidenceReservationPaymentInTransaction,
  sendConfirmedResidenceReservationPush,
} from "@/modules/residences/server";
import { env } from "@/infrastructure/env";
import {
  buildMobilePaymentReturnUrl,
  buildWebPaymentReturnUrl,
} from "@/modules/payments/server";
import { checkRateLimit, paymentCallbackLimiter } from "@/infrastructure/rate-limit";
import { securityIdentifier } from "@/infrastructure/security/identifier";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("reference") ?? request.nextUrl.searchParams.get("trxref");
  if (!reference || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(reference)) {
    return NextResponse.redirect(new URL("/?payment=invalid", request.url));
  }

  const rateLimitResponse = await checkRateLimit(
    paymentCallbackLimiter,
    securityIdentifier("payment-reference", reference),
  );
  if (rateLimitResponse) return rateLimitResponse;

  const callbackContext = await getPaymentCallbackContext(reference);
  if (!callbackContext) {
    return NextResponse.redirect(new URL("/?payment=invalid", request.url));
  }
  let result = "pending";
  try {
    const finalized = await verifyAndFinalizePaystackPayment(reference, undefined, {
      confirmResidenceReservationInTransaction:
        confirmResidenceReservationPaymentInTransaction,
    });
    result = finalized.status;
    if (finalized.status === "confirmed" && !finalized.alreadyConfirmed && "transactionType" in finalized && finalized.transactionType === "commande_restaurant") {
      await schedulePaidRestaurantOrderEffects(finalized.sourceId);
    }
    if (finalized.status === "confirmed" && !finalized.alreadyConfirmed && "transactionType" in finalized && finalized.transactionType === "reservation_residence") {
      await sendConfirmedResidenceReservationPush(finalized.sourceId);
    }
  } catch (error) {
    console.error("[paystack-callback] Verify refusé", error instanceof Error ? error.message : "Erreur inconnue");
    result = "error";
  }
  if (
    callbackContext.returnChannel === "mobile" &&
    env.MOBILE_APP_PAYMENT_RETURN_URL
  ) {
    return NextResponse.redirect(
      buildMobilePaymentReturnUrl(env.MOBILE_APP_PAYMENT_RETURN_URL, {
        result,
        reference,
        transactionType: callbackContext.transactionType,
        sourceId: callbackContext.sourceId,
      }),
    );
  }
  return NextResponse.redirect(
    buildWebPaymentReturnUrl(
      env.NEXT_PUBLIC_APP_URL,
      callbackContext.webDestination,
      result,
    ),
  );
}
