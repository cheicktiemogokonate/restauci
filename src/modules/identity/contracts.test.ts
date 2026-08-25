import { describe, expect, it } from "vitest";
import { identityDraftSchema, rejectIdentityVerificationSchema } from "./contracts";

describe("identity verification contracts", () => {
  it("normalizes the issuing country", () => {
    expect(identityDraftSchema.parse({ legalName: "  Aminata Koné  ", documentType: "national_id", documentCountryCode: "ci", documentExpiresOn: "2030-04-02" })).toMatchObject({ legalName: "Aminata Koné", documentCountryCode: "CI" });
  });

  it("rejects impossible calendar dates", () => {
    expect(() => identityDraftSchema.parse({ legalName: "Aminata Koné", documentType: "passport", documentCountryCode: "CI", documentExpiresOn: "2026-02-31" })).toThrow();
  });

  it("requires a meaningful rejection reason", () => {
    expect(() => rejectIdentityVerificationSchema.parse({ verificationId: crypto.randomUUID(), reason: "Non" })).toThrow();
  });
});
