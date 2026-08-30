import { describe, expect, it } from "vitest";
import {
  DELIVERY_OFFER_TTL_MS,
  DeliveryDomainError,
  assertDeliveryCanComplete,
  assertDeliveryCanStart,
  assertOfferCanBeAccepted,
  assertOrderCanReceiveDeliveryOffer,
  canApplyDeliveryTransition,
  getDeliveryOfferExpiry,
  getDeliveryTransitionTarget,
  getDriverAvailability,
  isActiveDeliveryStatus,
  isOfferExpired,
  shouldDeclinePendingOfferWhenUnavailable,
  type DeliveryStatus,
  type DeliveryTransitionAction,
} from "./model";

const readyDriver = {
  active: true,
  credentialsReady: true,
  declaredAvailable: true,
  hasActiveDelivery: false,
  hasPendingOffer: false,
};

describe("driver availability", () => {
  it.each([
    [{ ...readyDriver, active: false }, "disabled"],
    [{ ...readyDriver, credentialsReady: false }, "access_pending"],
    [{ ...readyDriver, declaredAvailable: false }, "unavailable"],
    [{ ...readyDriver, hasPendingOffer: true }, "requested"],
    [{ ...readyDriver }, "available"],
    [{ ...readyDriver, hasActiveDelivery: true }, "busy"],
    [
      { ...readyDriver, declaredAvailable: false, hasActiveDelivery: true },
      "busy",
    ],
  ] as const)("calcule l'état opérationnel", (input, expected) => {
    expect(getDriverAvailability(input)).toBe(expected);
  });

  it("refuse automatiquement une offre en attente lors du passage indisponible", () => {
    expect(
      shouldDeclinePendingOfferWhenUnavailable({
        offerStatus: "pending",
        declaredAvailable: false,
      }),
    ).toBe(true);
    expect(
      shouldDeclinePendingOfferWhenUnavailable({
        offerStatus: "accepted",
        declaredAvailable: false,
      }),
    ).toBe(false);
  });
});

describe("delivery offers", () => {
  it("expire une proposition après cinq minutes", () => {
    const now = new Date("2026-08-29T12:00:00.000Z");
    const expiry = getDeliveryOfferExpiry(now);
    expect(expiry.getTime() - now.getTime()).toBe(DELIVERY_OFFER_TTL_MS);
    expect(isOfferExpired(expiry, new Date(expiry.getTime() - 1))).toBe(false);
    expect(isOfferExpired(expiry, expiry)).toBe(true);
  });

  it.each(["en_preparation", "prete"])(
    "autorise une proposition pour une commande %s",
    (status) => {
      expect(() => assertOrderCanReceiveDeliveryOffer(status)).not.toThrow();
    },
  );

  it.each(["recue", "servie", "annulee"])(
    "refuse une proposition pour une commande %s",
    (status) => {
      expect(() => assertOrderCanReceiveDeliveryOffer(status)).toThrowError(
        expect.objectContaining({ code: "ORDER_NOT_DELIVERABLE" }),
      );
    },
  );

  it("accepte une proposition valide sur une livraison en attente", () => {
    expect(() =>
      assertOfferCanBeAccepted({
        offerStatus: "pending",
        expiresAt: new Date("2026-08-29T12:05:00.000Z"),
        now: new Date("2026-08-29T12:00:00.000Z"),
        driver: readyDriver,
        deliveryStatus: "en_attente",
      }),
    ).not.toThrow();
  });

  it("refuse une proposition expirée", () => {
    expect(() =>
      assertOfferCanBeAccepted({
        offerStatus: "pending",
        expiresAt: new Date("2026-08-29T12:00:00.000Z"),
        now: new Date("2026-08-29T12:00:00.000Z"),
        driver: readyDriver,
        deliveryStatus: "en_attente",
      }),
    ).toThrowError(expect.objectContaining({ code: "OFFER_EXPIRED" }));
  });
});

describe("delivery state machine", () => {
  const allowed: Array<
    [DeliveryStatus, DeliveryTransitionAction, DeliveryStatus]
  > = [
    ["en_attente", "assign", "assignee"],
    ["echouee", "assign", "assignee"],
    ["assignee", "unassign", "en_attente"],
    ["assignee", "start", "en_route"],
    ["en_route", "complete", "livree"],
    ["en_route", "fail", "echouee"],
    ["en_attente", "cancel", "annulee"],
    ["assignee", "cancel", "annulee"],
    ["echouee", "cancel", "annulee"],
  ];

  it.each(allowed)("autorise %s --%s--> %s", (from, action, to) => {
    expect(canApplyDeliveryTransition(from, action)).toBe(true);
    expect(getDeliveryTransitionTarget(from, action)).toBe(to);
  });

  it.each([
    ["livree", "assign"],
    ["annulee", "assign"],
    ["en_route", "unassign"],
    ["assignee", "complete"],
    ["livree", "fail"],
    ["en_route", "cancel"],
  ] as Array<[DeliveryStatus, DeliveryTransitionAction]>) (
    "refuse %s --%s-->",
    (from, action) => {
      expect(canApplyDeliveryTransition(from, action)).toBe(false);
      expect(() => getDeliveryTransitionTarget(from, action)).toThrow(
        DeliveryDomainError,
      );
    },
  );

  it.each([
    ["assignee", true],
    ["en_route", true],
    ["en_attente", false],
    ["livree", false],
    ["echouee", false],
    ["annulee", false],
  ] as const)("classe %s comme actif=%s", (status, active) => {
    expect(isActiveDeliveryStatus(status)).toBe(active);
  });
});

describe("pickup and completion guards", () => {
  it("interdit le départ avant que la commande soit prête", () => {
    expect(() =>
      assertDeliveryCanStart({
        deliveryStatus: "assignee",
        orderStatus: "en_preparation",
      }),
    ).toThrowError(expect.objectContaining({ code: "ORDER_NOT_READY" }));
  });

  it("exige une preuve client pour terminer", () => {
    expect(() =>
      assertDeliveryCanComplete({
        deliveryStatus: "en_route",
        proofVerified: false,
        cashRequired: false,
        cashCollected: false,
      }),
    ).toThrowError(
      expect.objectContaining({ code: "DELIVERY_PROOF_REQUIRED" }),
    );
  });

  it("exige l'encaissement du montant cash", () => {
    expect(() =>
      assertDeliveryCanComplete({
        deliveryStatus: "en_route",
        proofVerified: true,
        cashRequired: true,
        cashCollected: false,
      }),
    ).toThrowError(
      expect.objectContaining({
        code: "DELIVERY_CASH_CONFIRMATION_REQUIRED",
      }),
    );
  });

  it("autorise une remise prouvée et encaissée", () => {
    expect(() =>
      assertDeliveryCanComplete({
        deliveryStatus: "en_route",
        proofVerified: true,
        cashRequired: true,
        cashCollected: true,
      }),
    ).not.toThrow();
  });
});
