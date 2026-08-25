import { describe, expect, it } from "vitest";
import {
  assertPartnerAccess,
  PartnerAuthorizationError,
} from "./partner-account-policy";
import type { PartnerAccount } from "@/lib/db/types";

const account: PartnerAccount = {
  id: "45c962dd-cf91-4b08-9c9d-a08d4018560a",
  userId: "user-owner",
  activityType: "restaurant",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

describe("partner account authorization policy", () => {
  it("accepts the owner with the expected activity", () => {
    expect(
      assertPartnerAccess(
        { userId: "user-owner", role: "partner" },
        account,
        "restaurant",
      ),
    ).toBe(account);
  });

  it.each([
    [null, account, "unauthenticated"],
    [{ userId: "admin", role: "admin" as const }, account, "not_partner"],
    [
      { userId: "another-partner", role: "partner" as const },
      account,
      "missing_partner_account",
    ],
  ])("rejects an unauthorized identity", (identity, partnerAccount, code) => {
    expect(() => assertPartnerAccess(identity, partnerAccount)).toThrowError(
      expect.objectContaining<Partial<PartnerAuthorizationError>>({
        code: code as PartnerAuthorizationError["code"],
      }),
    );
  });

  it("rejects an activity mismatch", () => {
    expect(() =>
      assertPartnerAccess(
        { userId: "user-owner", role: "partner" },
        account,
        "residence",
      ),
    ).toThrowError(
      expect.objectContaining<Partial<PartnerAuthorizationError>>({
        code: "wrong_activity",
      }),
    );
  });
});
