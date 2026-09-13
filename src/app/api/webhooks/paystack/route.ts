import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/infrastructure/env";
import { getClientIp } from "@/shared/http/client-ip";
import { redis } from "@/infrastructure/cache/redis";
import { createLogger } from "@/infrastructure/logger";
import { verifyPaystackSignature } from "@/infrastructure/paystack/signature";
import { confirmProviderPayment, ProviderPaymentError } from "@/modules/payments/server";
import { fromPaystackSubunit, mapPaystackStatus, mapReliablePaystackNetwork } from "@/infrastructure/paystack/mapper";
import { schedulePaidRestaurantOrderEffects } from "@/modules/orders/server";
import {
  confirmResidenceReservationPaymentInTransaction,
  sendConfirmedResidenceReservationPush,
} from "@/modules/residences/server";

export const runtime = "nodejs";

const log = createLogger("paystack-webhook");

/**
 * Incrémente le compteur journalier de signatures invalides (alerting).
 * Best-effort : une panne Redis ne doit jamais empêcher la réponse 401.
 */
async function trackInvalidSignature(ip: string): Promise<void> {
  try {
    const day = new Date().toISOString().slice(0, 10);
    const key = `restauci:alert:paystack-invalid-sig:${day}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 2 * 24 * 3600);
    log.warn(
      { ip, invalidSignaturesToday: count },
      "Signature Paystack invalide",
    );
  } catch (err) {
    log.warn(
      { err: err instanceof Error ? err.message : "unknown" },
      "Compteur signatures invalides indisponible",
    );
  }
}

const eventSchema = z.object({
  event: z.string(),
  data: z.object({
    status: z.string(),
    reference: z.string().min(1),
    amount: z.number().int().positive(),
    currency: z.string(),
    channel: z.string().nullable().optional(),
    authorization: z.object({ bank: z.string().nullable().optional() }).passthrough().nullable().optional(),
  }),
});

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!env.PAYSTACK_SECRET_KEY || !verifyPaystackSignature(
    rawBody,
    request.headers.get("x-paystack-signature"),
    env.PAYSTACK_SECRET_KEY,
  )) {
    await trackInvalidSignature(getClientIp(request));
    return NextResponse.json({ received: false }, { status: 401 });
  }
  let body: unknown;
  try { body = JSON.parse(rawBody); } catch { return NextResponse.json({ received: false }, { status: 400 }); }
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ received: false }, { status: 400 });
  if (parsed.data.event !== "charge.success") {
    return NextResponse.json({ received: true, ignored: true });
  }
  try {
    const finalized = await confirmProviderPayment(
      {
        reference: parsed.data.data.reference,
        status: mapPaystackStatus(parsed.data.data.status),
        amountFcfa: fromPaystackSubunit(parsed.data.data.amount),
        currency: parsed.data.data.currency,
        network: mapReliablePaystackNetwork(parsed.data.data),
      },
      {
        confirmResidenceReservationInTransaction:
          confirmResidenceReservationPaymentInTransaction,
      },
    );
    if (finalized.status === "confirmed" && !finalized.alreadyConfirmed && "transactionType" in finalized && finalized.transactionType === "commande_restaurant") {
      await schedulePaidRestaurantOrderEffects(finalized.sourceId);
    }
    if (finalized.status === "confirmed" && !finalized.alreadyConfirmed && "transactionType" in finalized && finalized.transactionType === "reservation_residence") {
      await sendConfirmedResidenceReservationPush(finalized.sourceId);
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    if (error instanceof ProviderPaymentError && error.code === "PAYMENT_NOT_FOUND") {
      return NextResponse.json({ received: true, unknownReference: true });
    }
    console.error("[paystack-webhook] Finalisation refusée", error instanceof Error ? error.message : "Erreur inconnue");
    return NextResponse.json({ received: false }, { status: 400 });
  }
}
