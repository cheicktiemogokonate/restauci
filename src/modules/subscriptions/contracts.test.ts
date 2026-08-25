import { describe, expect, it } from "vitest";
import {
  partnerSubscriptionRequestSchema,
  subscriptionCataloguePayloadSchema,
  updateSubscriptionCatalogueSchema,
  validateOfflineSubscriptionRequestSchema,
} from "./contracts";
import {
  DEFAULT_DISCOVERY_POLICY,
  DEFAULT_PLAN_EXPOSURE,
} from "./model";

describe("contrat du catalogue d'abonnements", () => {
  const payload = {
    schemaVersion: 1 as const,
    plans: [
      { code: "decouverte" as const, ordre: 1 },
      { code: "croissance" as const, ordre: 2 },
      { code: "partenaire_fier" as const, ordre: 3 },
    ].map((plan) => ({
      ...plan,
      nom: plan.code,
      description: null,
      prixAnnuelFcfa: plan.code === "decouverte" ? 0 : 25_000,
      tauxCommissionBps: 1_500,
      restaurantLimits: { category: 5, dish: 20 },
      residenceLimits: { residence: 1 },
      actif: true,
      presentation: Object.fromEntries(
        (["restaurant", "residence"] as const).map((activityType) => [
          activityType,
          {
            ...DEFAULT_PLAN_EXPOSURE[plan.code],
            ctaLabel: "Choisir cette offre",
            features: ["Avantage réel"],
          },
        ]),
      ),
    })),
    policies: {
      restaurant: { ...DEFAULT_DISCOVERY_POLICY },
      residence: { ...DEFAULT_DISCOVERY_POLICY },
    },
  };

  it("accepte les limites Restaurant et Résidence", () => {
    expect(
      updateSubscriptionCatalogueSchema.parse({
        restaurantLimits: { category: 5, dish: 20 },
        residenceLimits: { residence: 1 },
      }),
    ).toEqual({
      restaurantLimits: { category: 5, dish: 20 },
      residenceLimits: { residence: 1 },
    });
  });

  it("accepte null comme limite illimitée", () => {
    expect(
      updateSubscriptionCatalogueSchema.parse({
        residenceLimits: { residence: null },
      }),
    ).toEqual({ residenceLimits: { residence: null } });
  });

  it("refuse une limite négative ou décimale", () => {
    expect(() =>
      updateSubscriptionCatalogueSchema.parse({
        residenceLimits: { residence: -1 },
      }),
    ).toThrow();
    expect(() =>
      updateSubscriptionCatalogueSchema.parse({
        residenceLimits: { residence: 1.5 },
      }),
    ).toThrow();
  });

  it("valide le catalogue complet et ses avantages d’exposition", () => {
    expect(subscriptionCataloguePayloadSchema.parse(payload)).toEqual(payload);
  });

  it("refuse une hiérarchie d’exposition incohérente", () => {
    const invalid = subscriptionCataloguePayloadSchema.parse(payload);
    invalid.plans[1]!.presentation.restaurant.exposureWeight = 7;
    expect(() => subscriptionCataloguePayloadSchema.parse(invalid)).toThrow(
      "Découverte < Croissance < Partenaire Fier",
    );
  });

  it("refuse un emplacement payant sur Découverte", () => {
    const invalid = subscriptionCataloguePayloadSchema.parse(payload);
    invalid.plans[0]!.presentation.residence.searchPromotedEligible = true;
    expect(() => subscriptionCataloguePayloadSchema.parse(invalid)).toThrow(
      "Découverte ne peut pas activer un emplacement payant",
    );
  });
});

describe("contrats des demandes d'abonnement", () => {
  const partnerAccountId = "00000000-0000-4000-8000-000000000001";
  const requestId = "00000000-0000-4000-8000-000000000002";

  it("accepte une demande portée uniquement par le compte partenaire", () => {
    expect(
      partnerSubscriptionRequestSchema.parse({
        partnerAccountId,
        planCode: "croissance",
      }),
    ).toEqual({ partnerAccountId, planCode: "croissance" });
  });

  it("valide les moyens de règlement hors ligne autorisés", () => {
    expect(
      validateOfflineSubscriptionRequestSchema.parse({
        requestId,
        paymentMethod: "virement",
        paymentReference: "VIR-2026-001",
      }),
    ).toEqual({
      requestId,
      paymentMethod: "virement",
      paymentReference: "VIR-2026-001",
    });
  });

  it("refuse un identifiant ou un moyen de règlement non autorisé", () => {
    expect(() =>
      partnerSubscriptionRequestSchema.parse({
        partnerAccountId: "restaurant-123",
        planCode: "croissance",
      }),
    ).toThrow();
    expect(() =>
      validateOfflineSubscriptionRequestSchema.parse({
        requestId,
        paymentMethod: "carte",
        paymentReference: "CARD-1",
      }),
    ).toThrow();
  });
});
