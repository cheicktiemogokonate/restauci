import { describe, expect, it } from "vitest";
import {
  activateDriverCredentialsSchema,
  completeDriverDeliverySchema,
  createRestaurantDriverSchema,
  confirmDriverCompensationPaymentSchema,
  failDriverDeliverySchema,
  respondToDeliveryOfferSchema,
} from "./contracts";

describe("delivery contracts", () => {
  it("valide un profil livreur sans accepter de restaurantId client", () => {
    expect(
      createRestaurantDriverSchema.safeParse({
        nom: "Awa Koné",
        telephone: "+225 0707070707",
        vehicule: "moto",
        numeroVehicule: "CI-1234-MD",
      }).success,
    ).toBe(true);
    expect(
      createRestaurantDriverSchema.safeParse({
        nom: "Awa Koné",
        telephone: "+225 0707070707",
        vehicule: "moto",
      }).success,
    ).toBe(true);
    expect(
      createRestaurantDriverSchema.safeParse({
        nom: "Awa Koné",
        telephone: "+225 0707070707",
        vehicule: "moto",
        restaurantId: crypto.randomUUID(),
      }).success,
    ).toBe(false);
  });

  it("accepte uniquement un montant fixe facultatif en FCFA", () => {
    expect(
      createRestaurantDriverSchema.safeParse({
        nom: "Awa Koné",
        telephone: "+225 0707070707",
        vehicule: "moto",
        fixedDeliveryCompensationFcfa: 300,
      }).success,
    ).toBe(true);
    expect(
      createRestaurantDriverSchema.safeParse({
        nom: "Awa Koné",
        telephone: "+225 0707070707",
        vehicule: "moto",
        fixedDeliveryCompensationFcfa: 0,
      }).success,
    ).toBe(false);
    expect(
      createRestaurantDriverSchema.safeParse({
        nom: "Awa Koné",
        telephone: "+225 0707070707",
        vehicule: "moto",
        compensationPercentage: 10,
      }).success,
    ).toBe(false);
  });

  it("valide une déclaration de règlement sans accepter de montant modifiable", () => {
    const driverId = crypto.randomUUID();
    expect(
      confirmDriverCompensationPaymentSchema.safeParse({
        driverId,
        note: "Règlement de fin de semaine",
      }).success,
    ).toBe(true);
    expect(
      confirmDriverCompensationPaymentSchema.safeParse({
        driverId,
        amountFcfa: 100,
      }).success,
    ).toBe(false);
  });

  it("exige un mot de passe permanent robuste", () => {
    expect(
      activateDriverCredentialsSchema.safeParse({
        activationToken: "a".repeat(30),
        password: "MotDePasse!2026",
      }).success,
    ).toBe(true);
    expect(
      activateDriverCredentialsSchema.safeParse({
        activationToken: "a".repeat(30),
        password: "motdepasse",
      }).success,
    ).toBe(false);
  });

  it("exige un motif pour refuser une proposition", () => {
    expect(
      respondToDeliveryOfferSchema.safeParse({ accept: false }).success,
    ).toBe(false);
    expect(
      respondToDeliveryOfferSchema.safeParse({
        accept: false,
        declineReason: "distance",
        becomeUnavailable: false,
      }).success,
    ).toBe(true);
  });

  it("n'accepte qu'un code de remise à six chiffres", () => {
    const deliveryId = crypto.randomUUID();
    expect(
      completeDriverDeliverySchema.safeParse({
        deliveryId,
        proofCode: "123456",
        cashCollected: true,
      }).success,
    ).toBe(true);
    expect(
      completeDriverDeliverySchema.safeParse({
        deliveryId,
        proofCode: "1234",
      }).success,
    ).toBe(false);
  });

  it("exige une note lorsque le motif d'échec est autre", () => {
    const deliveryId = crypto.randomUUID();
    expect(
      failDriverDeliverySchema.safeParse({ deliveryId, reason: "other" })
        .success,
    ).toBe(false);
    expect(
      failDriverDeliverySchema.safeParse({
        deliveryId,
        reason: "other",
        note: "Le client demande une nouvelle tentative demain.",
      }).success,
    ).toBe(true);
  });
});
