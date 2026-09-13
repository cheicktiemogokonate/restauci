import { describe, expect, it } from "vitest";
import {
  isRestaurantOrderable,
  isRestaurantPubliclyVisible,
  evaluateRestaurantOrderability,
} from "./model";
import { restaurantSearchSchema } from "./contracts";

describe("restaurant visibility and orderability", () => {
  it("keeps an offline restaurant publicly visible while blocking orders", () => {
    const restaurant = {
      actif: true,
      suspendu: false,
      enLigne: false,
      accepteCommandes: true,
      ownerIdentityStatus: "verified" as const,
    };
    expect(isRestaurantPubliclyVisible(restaurant)).toBe(true);
    expect(isRestaurantOrderable(restaurant)).toBe(false);
  });

  it("keeps a restaurant visible while order intake is paused", () => {
    const restaurant = {
      actif: true,
      suspendu: false,
      enLigne: true,
      accepteCommandes: false,
      ownerIdentityStatus: "verified" as const,
    };
    expect(isRestaurantPubliclyVisible(restaurant)).toBe(true);
    expect(isRestaurantOrderable(restaurant)).toBe(false);
  });

  it("hides administratively suspended restaurants", () => {
    expect(
      isRestaurantPubliclyVisible({
        actif: true,
        suspendu: true,
        ownerIdentityStatus: "verified",
      }),
    ).toBe(false);
  });
});

describe("restaurant geographic orderability", () => {
  const restaurant = {
    actif: true,
    suspendu: false,
    enLigne: true,
    accepteCommandes: true,
    ownerIdentityStatus: "verified" as const,
  };

  it("refuses another market only when enforcement is active", () => {
    expect(
      evaluateRestaurantOrderability({
        restaurant,
        policyMode: "enforce",
        hasMarketAssignment: true,
        sameServiceMarket: false,
        restaurantCapabilityActive: true,
      }),
    ).toEqual({ orderable: false, reason: "SERVICE_MARKET_MISMATCH" });
    expect(
      evaluateRestaurantOrderability({
        restaurant,
        policyMode: "shadow",
        hasMarketAssignment: true,
        sameServiceMarket: false,
        restaurantCapabilityActive: true,
      }),
    ).toEqual({ orderable: true, reason: null });
  });

  it("hides an approved restaurant until its owner identity is verified", () => {
    expect(
      isRestaurantPubliclyVisible({
        actif: true,
        suspendu: false,
        ownerIdentityStatus: "pending",
      }),
    ).toBe(false);
  });
});

describe("restaurant market search contract", () => {
  it("requires a complete current location and has no eligibility radius", () => {
    const result = restaurantSearchSchema.parse({
      currentLocation: {
        lat: 7.69,
        lng: -5.03,
        accuracyMeters: 25,
        capturedAt: "2026-08-23T10:00:00.000Z",
      },
      search: "maquis",
    });
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.currentLocation.lat).toBe(7.69);
  });
});
