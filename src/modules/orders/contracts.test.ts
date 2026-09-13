import { describe, expect, it } from "vitest";
import { createRestaurantOrderSchema } from "./contracts";

const validPayload = {
  restaurantSlug: "chez-nous",
  modeCommande: "livraison" as const,
  paymentMethod: "cash" as const,
  adresseLivraison: "Rue 12",
  latitudeLivraison: 5.348,
  longitudeLivraison: -4.027,
  items: [
    { platId: "00000000-0000-4000-8000-000000000001", quantite: 2 },
  ],
  idempotencyKey: "00000000-0000-4000-8000-000000000099",
};

describe("contrat HTTP de création Restaurant", () => {
  it("accepte uniquement l’intention client", () => {
    expect(createRestaurantOrderSchema.safeParse(validPayload).success).toBe(true);
  });

  it.each(["prix", "price", "sousTotal", "subtotal", "fraisLivraison", "deliveryFee", "total", "commission", "clientId", "statut", "paid"])(
    "refuse le champ client non fiable %s",
    (field) => {
      expect(
        createRestaurantOrderSchema.safeParse({
          ...validPayload,
          [field]: 100,
        }).success,
      ).toBe(false);
    },
  );

  it("exige une adresse et ses coordonnées uniquement pour la livraison", () => {
    const withoutAddress = {
      ...validPayload,
      adresseLivraison: undefined,
      latitudeLivraison: undefined,
      longitudeLivraison: undefined,
    };
    expect(createRestaurantOrderSchema.safeParse(withoutAddress).success).toBe(false);
    expect(
      createRestaurantOrderSchema.safeParse({
        ...withoutAddress,
        modeCommande: "emporter",
      }).success,
    ).toBe(true);
  });

  it("refuse une adresse de livraison dont les coordonnées sont partielles", () => {
    expect(
      createRestaurantOrderSchema.safeParse({
        ...validPayload,
        longitudeLivraison: undefined,
      }).success,
    ).toBe(false);
  });

  it.each([0, -1, 1.5, 21, "2"])("refuse la quantité %s", (quantite) => {
    expect(
      createRestaurantOrderSchema.safeParse({
        ...validPayload,
        items: [{ ...validPayload.items[0], quantite }],
      }).success,
    ).toBe(false);
  });

  it("limite l’intention de paiement aux trois méthodes MVP", () => {
    expect(createRestaurantOrderSchema.safeParse({ ...validPayload, paymentMethod: "mobile_money" }).success).toBe(true);
    expect(createRestaurantOrderSchema.safeParse({ ...validPayload, paymentMethod: "card" }).success).toBe(true);
    expect(createRestaurantOrderSchema.safeParse({ ...validPayload, paymentMethod: "paid" }).success).toBe(false);
  });
});
