import { describe, expect, it } from "vitest";
import {
  assertPaymentDetails,
  assertPositiveFcfa,
  FinancialTransactionError,
  mapOfflinePaymentMethod,
} from "./model";

describe("transaction and payment invariants", () => {
  it("keeps FCFA amounts as positive integers without subunit conversion", () => {
    expect(() => assertPositiveFcfa(25_000)).not.toThrow();
    expect(() => assertPositiveFcfa(0)).toThrow(FinancialTransactionError);
    expect(() => assertPositiveFcfa(25_000.5)).toThrow(FinancialTransactionError);
  });

  it("accepts normal cash with no provider", () => {
    expect(() =>
      assertPaymentDetails({ method: "cash", provider: null }),
    ).not.toThrow();
  });

  it("rejects incoherent provider and network details", () => {
    expect(() =>
      assertPaymentDetails({
        method: "cash",
        provider: "manual",
      }),
    ).toThrow(FinancialTransactionError);
    expect(() =>
      assertPaymentDetails({
        method: "card",
        providerReference: "provider-ref",
      }),
    ).toThrow(FinancialTransactionError);
    expect(() =>
      assertPaymentDetails({ method: "card", network: "wave" }),
    ).toThrow(FinancialTransactionError);
  });

  it("maps existing offline methods without treating cash as manual", () => {
    expect(mapOfflinePaymentMethod("especes")).toBe("cash");
    expect(mapOfflinePaymentMethod("mobile_money")).toBe("mobile_money");
    expect(mapOfflinePaymentMethod("virement")).toBe("bank_transfer");
    expect(mapOfflinePaymentMethod("cheque")).toBe("cheque");
  });
});
