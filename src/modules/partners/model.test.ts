import { describe, expect, it } from "vitest";
import type { PartnerAccountDTO } from "./contracts";
import {
  assertPartnerAccess,
  PARTNER_ACTIVITY_TYPES,
  PartnerAuthorizationError,
} from "./model";

const account: PartnerAccountDTO = {
  id: "45c962dd-cf91-4b08-9c9d-a08d4018560a",
  userId: "partner-owner",
  activityType: "restaurant",
  createdAt: "2026-09-05T00:00:00.000Z",
  updatedAt: "2026-09-05T00:00:00.000Z",
};

describe("partners model", () => {
  it("expose exactement les deux activités disponibles", () => {
    expect(PARTNER_ACTIVITY_TYPES).toEqual(["restaurant", "residence"]);
  });

  it("autorise uniquement le propriétaire partenaire du bon vertical", () => {
    expect(
      assertPartnerAccess(
        { userId: "partner-owner", role: "partner" },
        account,
        "restaurant",
      ),
    ).toBe(account);
  });

  it.each([
    [null, account, undefined, "unauthenticated"],
    [
      { userId: "admin", role: "admin" as const },
      account,
      undefined,
      "not_partner",
    ],
    [
      { userId: "other", role: "partner" as const },
      account,
      undefined,
      "missing_partner_account",
    ],
    [
      { userId: "partner-owner", role: "partner" as const },
      account,
      "residence" as const,
      "wrong_activity",
    ],
  ])("refuse les accès incohérents", (identity, candidate, activity, code) => {
    expect(() => assertPartnerAccess(identity, candidate, activity)).toThrowError(
      expect.objectContaining<Partial<PartnerAuthorizationError>>({
        code: code as PartnerAuthorizationError["code"],
      }),
    );
  });
});
