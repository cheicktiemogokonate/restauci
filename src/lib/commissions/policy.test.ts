import { describe, expect, it } from "vitest";
import { calculateArrearsRecovery, resolveCashAccess } from "./policy";

describe("accès aux commandes cash", () => {
  const triggeredAt = new Date("2026-08-01T00:00:00Z");

  it("reste ouvert pendant le délai de grâce", () => {
    expect(resolveCashAccess({
      outstandingDebtFcfa: 12_000,
      cycle: { triggeredAt, graceDaysSnapshot: 7 },
      now: new Date("2026-08-07T23:59:59Z"),
    }).cashAllowed).toBe(true);
  });

  it("se ferme après le délai tant que la dette subsiste", () => {
    expect(resolveCashAccess({
      outstandingDebtFcfa: 1,
      cycle: { triggeredAt, graceDaysSnapshot: 7 },
      now: new Date("2026-08-08T00:00:00Z"),
    })).toMatchObject({ cashAllowed: false, reason: "CASH_DEBT_GRACE_EXPIRED" });
  });

  it("se rouvre dès que la dette est entièrement soldée", () => {
    expect(resolveCashAccess({
      outstandingDebtFcfa: 0,
      cycle: { triggeredAt, graceDaysSnapshot: 7 },
      now: new Date("2026-08-20T00:00:00Z"),
    }).cashAllowed).toBe(true);
  });
});

describe("cash debt recovery", () => {
  it("borne la récupération par 50 % du net partenaire et la dette disponible", () => {
    expect(calculateArrearsRecovery({ normalPartnerNetFcfa: 10_000, availableDebtFcfa: 10_000, recoveryBps: 5_000 })).toBe(5_000);
    expect(calculateArrearsRecovery({ normalPartnerNetFcfa: 20_000, availableDebtFcfa: 3_000, recoveryBps: 5_000 })).toBe(3_000);
  });
});
