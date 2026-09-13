import { describe, expect, it } from "vitest";
import {
  assertSafeCausalPayload,
  getEventRetentionDeadline,
  getOutboxRetryDelaySeconds,
} from "./model";

describe("causal event policies", () => {
  it("accepts bounded identifiers and status facts", () => {
    expect(
      assertSafeCausalPayload({
        transactionId: crypto.randomUUID(),
        status: "confirmed",
        providerReference: "PAY-123",
        amountFcfa: 25_000,
      }),
    ).toMatchObject({ status: "confirmed", amountFcfa: 25_000 });
  });

  it.each([
    ["password", "secret"],
    ["refreshToken", "secret"],
    ["identityDocumentId", "base64"],
    ["email", "person@example.test"],
    ["motif", "texte libre"],
  ])("rejects sensitive or free-form field %s", (key, value) => {
    expect(() => assertSafeCausalPayload({ [key]: value })).toThrow(
      "CAUSAL_PAYLOAD_SENSITIVE_KEY",
    );
  });

  it("uses bounded exponential retry delays", () => {
    expect([1, 2, 3, 4, 8].map(getOutboxRetryDelaySeconds)).toEqual([
      5, 10, 20, 40, 300,
    ]);
  });

  it("retains an event for five years", () => {
    expect(
      getEventRetentionDeadline(new Date("2026-09-05T12:00:00.000Z")),
    ).toEqual(new Date("2031-09-05T12:00:00.000Z"));
  });
});
