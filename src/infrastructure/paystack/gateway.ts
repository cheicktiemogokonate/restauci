import "server-only";

import { env } from "@/lib/env";
import {
  fromPaystackSubunit,
  initializeResponseSchema,
  mapPaystackStatus,
  mapReliablePaystackNetwork,
  subaccountResponseSchema,
  toPaystackSubunit,
  verifyResponseSchema,
} from "./mapper";

const PAYSTACK_API_URL = "https://api.paystack.co";
const TIMEOUT_MS = 10_000;

export class PaystackGatewayError extends Error {
  constructor(
    public readonly code: "NOT_CONFIGURED" | "TIMEOUT" | "HTTP_ERROR" | "INVALID_RESPONSE",
    message: string,
    public readonly definitive = false,
  ) {
    super(message);
    this.name = "PaystackGatewayError";
  }
}

type Fetch = typeof fetch;

interface PaystackInitializeInput {
  amountFcfa: number;
  currency: "XOF";
  email: string;
  reference: string;
  callbackUrl: string;
  method: "mobile_money" | "card";
  metadata: { paymentId: string; transactionId: string; purpose: "commande_restaurant" | "abonnement_partenaire" | "commission_settlement" | "reservation_residence" };
  split?: { providerAccountReference: string; platformChargeFcfa: number; feeBearer: "account" };
}

export class PaystackGateway {
  constructor(
    private readonly secretKey = env.PAYSTACK_SECRET_KEY,
    private readonly fetchImpl: Fetch = fetch,
  ) {}

  private get headers() {
    if (!this.secretKey) {
      throw new PaystackGatewayError("NOT_CONFIGURED", "Paystack n’est pas configuré.", true);
    }
    return { Authorization: `Bearer ${this.secretKey}`, "Content-Type": "application/json" };
  }

  private async request(path: string, init: RequestInit) {
    try {
      const response = await this.fetchImpl(`${PAYSTACK_API_URL}${path}`, {
        ...init,
        headers: { ...this.headers, ...init.headers },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const json: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new PaystackGatewayError(
          "HTTP_ERROR",
          `Paystack a refusé la requête (${response.status}).`,
          response.status >= 400 && response.status < 500,
        );
      }
      return json;
    } catch (error) {
      if (error instanceof PaystackGatewayError) throw error;
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new PaystackGatewayError("TIMEOUT", "Paystack n’a pas répondu à temps.");
      }
      throw new PaystackGatewayError("HTTP_ERROR", "Paystack est temporairement indisponible.");
    }
  }

  async initialize(input: PaystackInitializeInput) {
    const payload: Record<string, unknown> = {
      email: input.email,
      amount: toPaystackSubunit(input.amountFcfa),
      currency: input.currency,
      reference: input.reference,
      callback_url: input.callbackUrl,
      channels: [input.method],
      metadata: JSON.stringify(input.metadata),
    };
    if (input.split) {
      payload.subaccount = input.split.providerAccountReference;
      payload.transaction_charge = toPaystackSubunit(input.split.platformChargeFcfa);
      payload.bearer = input.split.feeBearer;
    }
    const parsed = initializeResponseSchema.safeParse(
      await this.request("/transaction/initialize", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );
    if (!parsed.success) {
      throw new PaystackGatewayError("INVALID_RESPONSE", "Réponse Initialize Paystack invalide.");
    }
    return {
      reference: parsed.data.data.reference,
      authorizationUrl: parsed.data.data.authorization_url,
    };
  }

  async verify(reference: string) {
    const parsed = verifyResponseSchema.safeParse(
      await this.request(`/transaction/verify/${encodeURIComponent(reference)}`, { method: "GET" }),
    );
    if (!parsed.success) {
      throw new PaystackGatewayError("INVALID_RESPONSE", "Réponse Verify Paystack invalide.");
    }
    return {
      reference: parsed.data.data.reference,
      status: mapPaystackStatus(parsed.data.data.status),
      amountFcfa: fromPaystackSubunit(parsed.data.data.amount),
      currency: parsed.data.data.currency,
      network: mapReliablePaystackNetwork(parsed.data.data),
    };
  }

  async getSubaccount(reference: string) {
    if (!/^ACCT_[A-Za-z0-9]+$/.test(reference)) {
      throw new PaystackGatewayError("INVALID_RESPONSE", "Code subaccount Paystack invalide.", true);
    }
    const parsed = subaccountResponseSchema.safeParse(
      await this.request(`/subaccount/${encodeURIComponent(reference)}`, { method: "GET" }),
    );
    if (!parsed.success) {
      throw new PaystackGatewayError("INVALID_RESPONSE", "Réponse subaccount Paystack invalide.");
    }
    return {
      reference: parsed.data.data.subaccount_code,
      businessName: parsed.data.data.business_name,
      active: parsed.data.data.active,
      verified: parsed.data.data.is_verified,
      currency: parsed.data.data.currency ?? null,
    };
  }
}
