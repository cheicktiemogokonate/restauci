import { describe, expect, it } from "vitest";
import { auditInputSchema } from "./contracts";

describe("audit contract", () => {
  it("requires event and correlation identifiers together", () => {
    const base = {
      actor: { type: "system" as const, id: "toutci" },
      action: "abonnement_expire" as const,
      resourceType: "partner_account",
      resourceId: crypto.randomUUID(),
    };
    expect(auditInputSchema.safeParse(base).success).toBe(true);
    expect(
      auditInputSchema.safeParse({ ...base, eventId: crypto.randomUUID() }).success,
    ).toBe(false);
  });
});
