import { describe, expect, it } from "vitest";
import {
  addOneSubscriptionYear,
  evaluateSubscriptionTransition,
  isPaidPeriodEffective,
  buildReactivationDecision,
  buildUpgradeClosure,
} from "./model";

const discovery = { code: "decouverte", ordre: 0, prixAnnuelFcfa: 0, actif: true };
const growth = { code: "croissance", ordre: 1, prixAnnuelFcfa: 25_000, actif: true };
const partner = { code: "partenaire_fier", ordre: 2, prixAnnuelFcfa: 50_000, actif: true };

describe("subscription transitions", () => {
  it("allows both paid plans from the discovery fallback", () => {
    expect(evaluateSubscriptionTransition(null, growth)).toEqual({ allowed: true, kind: "first_paid" });
    expect(evaluateSubscriptionTransition(null, partner)).toEqual({ allowed: true, kind: "first_paid" });
  });

  it("allows an upgrade and rejects a downgrade", () => {
    expect(evaluateSubscriptionTransition(growth, partner)).toEqual({ allowed: true, kind: "upgrade" });
    expect(evaluateSubscriptionTransition(partner, growth)).toEqual({ allowed: false, reason: "downgrade" });
  });

  it("rejects discovery and an early same-plan renewal", () => {
    expect(evaluateSubscriptionTransition(partner, discovery)).toEqual({ allowed: false, reason: "discovery_not_purchasable" });
    expect(evaluateSubscriptionTransition(growth, growth)).toEqual({ allowed: false, reason: "same_plan" });
  });

  it("preserves the exact time when adding one calendar year", () => {
    const startAt = new Date("2026-08-11T14:30:45.000Z");
    expect(addOneSubscriptionYear(startAt).toISOString()).toBe("2027-08-11T14:30:45.000Z");
  });

  it("treats an expired active row as ineffective", () => {
    const now = new Date("2026-08-11T14:30:45.000Z");
    expect(isPaidPeriodEffective({
      planCode: "croissance",
      statut: "active",
      dateDebut: new Date("2025-08-11T14:30:45.000Z"),
      dateEcheance: now,
    }, now)).toBe(false);
  });

  it("treats a current paid row as effective and discovery as fallback-only", () => {
    const now = new Date("2026-08-11T14:30:45.000Z");
    const period = {
      statut: "active",
      dateDebut: new Date("2026-01-01T00:00:00.000Z"),
      dateEcheance: new Date("2027-01-01T00:00:00.000Z"),
    };
    expect(isPaidPeriodEffective({ ...period, planCode: "croissance" }, now)).toBe(true);
    expect(isPaidPeriodEffective({ ...period, planCode: "decouverte" }, now)).toBe(false);
  });

  it("closes the previous period with an explicit upgrade reason", () => {
    const upgradedAt = new Date("2026-07-01T12:00:00.000Z");
    expect(buildUpgradeClosure(upgradedAt)).toEqual({
      statut: "terminee",
      endedAt: upgradedAt,
      endReason: "upgrade",
    });
  });

  it("reactivates without moving the planned deadline", () => {
    const deadline = new Date("2027-01-01T00:00:00.000Z");
    const decision = buildReactivationDecision(
      deadline,
      new Date("2026-07-11T00:00:00.000Z"),
    );
    expect(decision.reactivated).toBe(true);
    expect(decision.update.dateEcheance).toBe(deadline);
  });
});
