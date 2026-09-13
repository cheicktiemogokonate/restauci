import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/infrastructure/env", () => ({
  env: { PAYSTACK_SECRET_KEY: "sk_test_fixture", NEXT_PUBLIC_APP_URL: "http://localhost:3000" },
}));

import { PaystackGateway, PaystackGatewayError } from "./gateway";
import { fromPaystackSubunit, toPaystackSubunit } from "./mapper";
import { verifyPaystackSignature } from "./signature";

describe("Paystack adapter", () => {
  it("confine la conversion XOF ×100", () => {
    expect(toPaystackSubunit(25_000)).toBe(2_500_000);
    expect(fromPaystackSubunit(2_500_000)).toBe(25_000);
    expect(() => fromPaystackSubunit(101)).toThrow();
  });

  it("initialise un split avec charge fixe et frais portés par Toutci", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const payload = JSON.parse(String(init?.body));
      expect(payload).toMatchObject({
        amount: 2_000_000,
        currency: "XOF",
        reference: "toutci-order-ref",
        channels: ["mobile_money"],
        subaccount: "ACCT_fixture",
        transaction_charge: 540_000,
        bearer: "account",
      });
      return new Response(JSON.stringify({
        status: true,
        message: "Authorization URL created",
        data: { authorization_url: "https://checkout.paystack.com/access", access_code: "access", reference: "toutci-order-ref" },
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    const gateway = new PaystackGateway("sk_test_fixture", fetchMock as typeof fetch);
    await expect(gateway.initialize({
      amountFcfa: 20_000,
      currency: "XOF",
      email: "client@example.com",
      reference: "toutci-order-ref",
      callbackUrl: "https://toutci.app/api/payments/paystack/callback",
      method: "mobile_money",
      metadata: { paymentId: "p1", transactionId: "t1", purpose: "commande_restaurant" },
      split: { providerAccountReference: "ACCT_fixture", platformChargeFcfa: 5_400, feeBearer: "account" },
    })).resolves.toEqual({ reference: "toutci-order-ref", authorizationUrl: "https://checkout.paystack.com/access" });
  });

  it("parse Verify et ne déduit le réseau que d’un champ fiable", async () => {
    const gateway = new PaystackGateway("sk_test_fixture", vi.fn(async () => new Response(JSON.stringify({
      status: true,
      message: "Verification successful",
      data: { status: "success", reference: "ref", amount: 750_000, currency: "XOF", channel: "mobile_money", authorization: { bank: "Orange Money" } },
    }), { status: 200 })) as typeof fetch);
    await expect(gateway.verify("ref")).resolves.toMatchObject({ status: "success", amountFcfa: 7_500, network: "orange" });
  });

  it("liste les destinations XOF et distingue Mobile Money des banques", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toContain("/bank?currency=XOF&perPage=100");
      return new Response(JSON.stringify({
        status: true,
        message: "Banks retrieved",
        data: [
          { name: "Wave Côte d’Ivoire", code: "WAVE_CI", type: "mobile_money", active: true, currency: "XOF" },
          { name: "Djamo", code: "CI202", type: "bceao", active: true, currency: "XOF" },
          { name: "Ancienne banque", code: "OLD", type: "bceao", active: false, currency: "XOF" },
        ],
      }), { status: 200 });
    });
    const gateway = new PaystackGateway("sk_test_fixture", fetchMock as typeof fetch);

    await expect(gateway.listInstitutions("XOF")).resolves.toEqual([
      { code: "WAVE_CI", name: "Wave Côte d’Ivoire", type: "mobile_money" },
      { code: "CI202", name: "Djamo", type: "bank_account" },
    ]);
  });

  it("crée un subaccount sans commission implicite et ne retourne pas le numéro complet", async () => {
    const accountIdentifier = "0700000000";
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(JSON.parse(String(init?.body))).toEqual({
        business_name: "Résidence Toutci",
        settlement_bank: "WAVE_CI",
        account_number: accountIdentifier,
        percentage_charge: 0,
      });
      return new Response(JSON.stringify({
        status: true,
        message: "Subaccount created",
        data: {
          subaccount_code: "ACCT_fixture",
          business_name: "Résidence Toutci",
          active: true,
          is_verified: false,
          currency: "XOF",
          settlement_bank: "Wave Côte d’Ivoire",
        },
      }), { status: 200 });
    });
    const gateway = new PaystackGateway("sk_test_fixture", fetchMock as typeof fetch);

    const result = await gateway.createSubaccount({
      businessName: "Résidence Toutci",
      institutionCode: "WAVE_CI",
      accountIdentifier,
      percentageCharge: 0,
    });

    expect(result).toMatchObject({
      reference: "ACCT_fixture",
      active: true,
      verified: false,
      environment: "test",
      institutionCode: "WAVE_CI",
    });
    expect(JSON.stringify(result)).not.toContain(accountIdentifier);
  });

  it("refuse JSON invalide, erreur provider et timeout", async () => {
    const invalid = new PaystackGateway("sk_test_fixture", vi.fn(async () => new Response("{}", { status: 200 })) as typeof fetch);
    await expect(invalid.verify("ref")).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
    const refused = new PaystackGateway("sk_test_fixture", vi.fn(async () => new Response("{}", { status: 400 })) as typeof fetch);
    await expect(refused.verify("ref")).rejects.toMatchObject({ code: "HTTP_ERROR", definitive: true });
    const timedOut = new PaystackGateway("sk_test_fixture", vi.fn(async () => { throw new DOMException("timeout", "TimeoutError"); }) as typeof fetch);
    await expect(timedOut.verify("ref")).rejects.toEqual(expect.objectContaining<Partial<PaystackGatewayError>>({ code: "TIMEOUT" }));
  });
});

describe("signature webhook Paystack", () => {
  const secret = "sk_test_fixture";
  const raw = JSON.stringify({ event: "charge.success", data: { reference: "ref" } });
  const signature = createHmac("sha512", secret).update(raw).digest("hex");

  it("accepte le HMAC exact", () => expect(verifyPaystackSignature(raw, signature, secret)).toBe(true));
  it("refuse une signature erronée", () => expect(verifyPaystackSignature(raw, "0".repeat(128), secret)).toBe(false));
  it("refuse un body modifié", () => expect(verifyPaystackSignature(`${raw} `, signature, secret)).toBe(false));
});
