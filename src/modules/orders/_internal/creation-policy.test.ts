import { describe, expect, it } from "vitest";
import {
  calculateRestaurantOrderAmounts,
  hashRestaurantOrderIntent,
  normalizeRestaurantOrderInput,
  RestaurantOrderError,
} from "./creation-policy";

const baseInput = {
  restaurantSlug: "chez-nous",
  modeCommande: "livraison" as const,
  paymentMethod: "cash" as const,
  adresseLivraison: "Rue 12",
  items: [
    { platId: "00000000-0000-4000-8000-000000000001", quantite: 1 },
    { platId: "00000000-0000-4000-8000-000000000002", quantite: 2 },
  ],
};

describe("intention de commande Restaurant", () => {
  it("calcule 2 × 3 500 FCFA + 500 FCFA de livraison", () => {
    expect(
      calculateRestaurantOrderAmounts({
        items: [{ prix: 3_500, quantite: 2 }],
        modeCommande: "livraison",
        fraisLivraisonFcfa: 500,
        commandeMinimumFcfa: 5_000,
      }),
    ).toEqual({ sousTotal: 7_000, fraisLivraison: 500, remise: 0, total: 7_500 });
  });

  it("évalue le minimum avant les frais de livraison", () => {
    expect(() =>
      calculateRestaurantOrderAmounts({
        items: [{ prix: 4_500, quantite: 1 }],
        modeCommande: "livraison",
        fraisLivraisonFcfa: 1_000,
        commandeMinimumFcfa: 5_000,
      }),
    ).toThrow("Commande minimum");
  });

  it("force les frais à zéro hors livraison", () => {
    expect(
      calculateRestaurantOrderAmounts({
        items: [{ prix: 3_500, quantite: 1 }],
        modeCommande: "emporter",
        fraisLivraisonFcfa: 500,
        commandeMinimumFcfa: 0,
      }).fraisLivraison,
    ).toBe(0);
  });

  it("normalise les doublons et l’ordre des plats", () => {
    const normalized = normalizeRestaurantOrderInput({
      ...baseInput,
      items: [
        { platId: "00000000-0000-4000-8000-000000000002", quantite: 2 },
        { platId: "00000000-0000-4000-8000-000000000001", quantite: 1 },
        { platId: "00000000-0000-4000-8000-000000000002", quantite: 3 },
      ],
    });

    expect(normalized.items).toEqual([
      { platId: "00000000-0000-4000-8000-000000000001", quantite: 1 },
      { platId: "00000000-0000-4000-8000-000000000002", quantite: 5 },
    ]);
  });

  it("produit le même hash pour le même panier dans un ordre différent", () => {
    const reversed = { ...baseInput, items: [...baseInput.items].reverse() };
    expect(
      hashRestaurantOrderIntent(normalizeRestaurantOrderInput(baseInput)),
    ).toBe(hashRestaurantOrderIntent(normalizeRestaurantOrderInput(reversed)));
  });

  it("produit un hash différent lorsque l’intention change", () => {
    const changed = {
      ...baseInput,
      items: [{ ...baseInput.items[0], quantite: 2 }],
    };
    expect(
      hashRestaurantOrderIntent(normalizeRestaurantOrderInput(baseInput)),
    ).not.toBe(hashRestaurantOrderIntent(normalizeRestaurantOrderInput(changed)));
  });

  it("exclut la mesure GPS volatile de la clé d’idempotence", () => {
    const first = normalizeRestaurantOrderInput({
      ...baseInput,
      currentLocation: {
        lat: 5.348,
        lng: -4.027,
        accuracyMeters: 15,
        capturedAt: "2026-08-23T12:00:00.000Z",
      },
    });
    const refreshed = normalizeRestaurantOrderInput({
      ...baseInput,
      currentLocation: {
        lat: 5.349,
        lng: -4.026,
        accuracyMeters: 8,
        capturedAt: "2026-08-23T12:00:05.000Z",
      },
    });

    expect(hashRestaurantOrderIntent(first)).toBe(
      hashRestaurantOrderIntent(refreshed),
    );
  });

  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER])(
    "refuse la quantité invalide %s",
    (quantite) => {
      expect(() =>
        normalizeRestaurantOrderInput({
          ...baseInput,
          items: [{ ...baseInput.items[0], quantite }],
        }),
      ).toThrow(RestaurantOrderError);
    },
  );

  it("refuse un cumul de doublons supérieur à la limite", () => {
    expect(() =>
      normalizeRestaurantOrderInput({
        ...baseInput,
        items: [
          { ...baseInput.items[0], quantite: 11 },
          { ...baseInput.items[0], quantite: 10 },
        ],
      }),
    ).toThrow("quantité maximale");
  });
});
