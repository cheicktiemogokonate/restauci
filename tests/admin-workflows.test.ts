import { describe, expect, it } from "vitest";
import {
  extendSubscriptionDeadline,
  getAdminRestaurantStatus,
  normalizeSettlementInput,
} from "../src/lib/config/admin-workflows";

describe("workflows administrateur", () => {
  it("distingue un restaurant rejeté d’une demande en attente", () => {
    expect(
      getAdminRestaurantStatus({
        actif: false,
        suspendu: false,
        motifRejet: null,
      }),
    ).toBe("en_attente");
    expect(
      getAdminRestaurantStatus({
        actif: false,
        suspendu: false,
        motifRejet: "Dossier incomplet",
      }),
    ).toBe("rejete");
  });

  it("donne la priorité à la suspension dans l’état administratif", () => {
    expect(
      getAdminRestaurantStatus({
        actif: true,
        suspendu: true,
        motifRejet: null,
      }),
    ).toBe("suspendu");
  });

  it("normalise une référence et des notes de règlement", () => {
    expect(normalizeSettlementInput("  TRX-2026-001  ", "  Reçu vérifié  ")).toEqual({
      reference: "TRX-2026-001",
      notes: "Reçu vérifié",
    });
  });

  it("refuse une référence financière insuffisante", () => {
    expect(() => normalizeSettlementInput("  x ")).toThrow(
      "entre 3 et 255 caractères",
    );
  });

  it("prolonge l’échéance de la durée de suspension", () => {
    const deadline = new Date("2026-12-31T00:00:00.000Z");
    const suspendedAt = new Date("2026-07-01T00:00:00.000Z");
    const reactivatedAt = new Date("2026-07-11T00:00:00.000Z");

    expect(
      extendSubscriptionDeadline(deadline, suspendedAt, reactivatedAt),
    ).toEqual(new Date("2027-01-10T00:00:00.000Z"));
  });

  it("conserve une échéance illimitée à la réactivation", () => {
    expect(
      extendSubscriptionDeadline(
        null,
        new Date("2026-07-01T00:00:00.000Z"),
        new Date("2026-07-11T00:00:00.000Z"),
      ),
    ).toBeNull();
  });
});
