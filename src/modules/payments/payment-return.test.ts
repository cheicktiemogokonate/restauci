import { describe, expect, it } from "vitest";
import {
  buildMobilePaymentReturnUrl,
  buildWebPaymentReturnUrl,
} from "./_internal/payment-return";

describe("retour de paiement multi-canal", () => {
  it("construit un deep link mobile fixe avec le résultat vérifiable", () => {
    const url = buildMobilePaymentReturnUrl("toutci://payments/callback", {
      result: "confirmed",
      reference: "toutci-order-123",
      transactionType: "commande_restaurant",
      sourceId: "order-id",
    });

    expect(url.protocol).toBe("toutci:");
    expect(url.host).toBe("payments");
    expect(url.searchParams.get("payment")).toBe("confirmed");
    expect(url.searchParams.get("reference")).toBe("toutci-order-123");
    expect(url.searchParams.get("type")).toBe("commande_restaurant");
    expect(url.searchParams.get("sourceId")).toBe("order-id");
  });

  it("conserve la destination web relative au serveur", () => {
    const url = buildWebPaymentReturnUrl(
      "https://toutci.app/api/payments/paystack/callback",
      "/reservations/reservation-id",
      "pending",
    );

    expect(url.toString()).toBe(
      "https://toutci.app/reservations/reservation-id?payment=pending",
    );
  });
});
