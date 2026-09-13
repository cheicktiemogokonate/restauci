import { describe, expect, it } from "vitest";
import {
  assertRefundCapacity,
  FINANCIAL_CHANNELS,
  FINANCIAL_DIRECTIONS,
  FINANCIAL_JOURNAL_ENTRY_TYPES,
  TRANSACTION_TYPES,
} from "@/modules/transactions/model";

describe("phase 6 financial model", () => {
  it("models refunds as financial obligations and journal outflows", () => {
    expect(TRANSACTION_TYPES).toContain("remboursement");
    expect(FINANCIAL_JOURNAL_ENTRY_TYPES).toContain(
      "refund_obligation_created",
    );
    expect(FINANCIAL_DIRECTIONS).toEqual(["inflow", "outflow"]);
    expect(FINANCIAL_CHANNELS).toContain("offline");
  });

  it("accepts partial refunds up to the confirmed original amount", () => {
    expect(() =>
      assertRefundCapacity({
        originalAmountFcfa: 25_000,
        alreadyRefundedFcfa: 10_000,
        requestedAmountFcfa: 15_000,
      }),
    ).not.toThrow();
  });

  it("rejects an over-refund", () => {
    expect(() =>
      assertRefundCapacity({
        originalAmountFcfa: 25_000,
        alreadyRefundedFcfa: 10_000,
        requestedAmountFcfa: 15_001,
      }),
    ).toThrowError(expect.objectContaining({ code: "REFUND_LIMIT_EXCEEDED" }));
  });
});
