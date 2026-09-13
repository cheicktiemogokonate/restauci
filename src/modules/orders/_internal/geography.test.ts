import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/infrastructure/env", () => ({
  env: { RESTAURANT_GEO_POLICY_MODE: "enforce" },
}));

const {
  resolveServiceMarketAtPoint,
  resolveServiceMarketAtCoordinates,
  getServiceMarketCapability,
} = vi.hoisted(() => ({
  resolveServiceMarketAtPoint: vi.fn(),
  resolveServiceMarketAtCoordinates: vi.fn(),
  getServiceMarketCapability: vi.fn(),
}));

vi.mock("@/modules/service-markets/server", () => ({
  resolveServiceMarketAtPoint,
  resolveServiceMarketAtCoordinates,
  getServiceMarketCapability,
}));

import { validateRestaurantOrderGeography } from "./geography";

const executor = { execute: vi.fn() };
const restaurant = {
  serviceMarketId: "market-abidjan",
  serviceMarketVersionId: "version-abidjan-v1",
};
const input = {
  modeCommande: "livraison" as const,
  currentLocation: {
    lat: 5.348,
    lng: -4.027,
    accuracyMeters: 12,
    capturedAt: "2026-08-23T12:00:00.000Z",
  },
  latitudeLivraison: 5.35,
  longitudeLivraison: -4.03,
};

function resolvedMarket(id = "market-abidjan") {
  return {
    status: "resolved" as const,
    market: {
      id,
      slug: id,
      name: id,
      versionId: `${id}-v1`,
      boundaryUncertain: false,
    },
  };
}

describe("validation géographique transactionnelle Restaurant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveServiceMarketAtPoint.mockResolvedValue(resolvedMarket());
    resolveServiceMarketAtCoordinates.mockResolvedValue(resolvedMarket());
    getServiceMarketCapability.mockResolvedValue({
      marketId: "market-abidjan",
      activityType: "restaurant",
      status: "active",
    });
  });

  it("fige le marché et la version résolus au moment de la commande", async () => {
    await expect(
      validateRestaurantOrderGeography(executor, restaurant, input),
    ).resolves.toMatchObject({
      serviceMarketId: "market-abidjan",
      serviceMarketVersionId: "market-abidjan-v1",
      clientLocationAccuracyM: 12,
      geoPolicyVersion: "restaurant-market-v1",
    });
  });

  it("refuse un client situé dans un autre marché", async () => {
    resolveServiceMarketAtPoint.mockResolvedValue(
      resolvedMarket("market-bouake"),
    );

    await expect(
      validateRestaurantOrderGeography(executor, restaurant, input),
    ).rejects.toMatchObject({ code: "SERVICE_MARKET_MISMATCH" });
  });

  it("refuse une adresse de livraison située dans un autre marché", async () => {
    resolveServiceMarketAtCoordinates.mockResolvedValue(
      resolvedMarket("market-bouake"),
    );

    await expect(
      validateRestaurantOrderGeography(executor, restaurant, input),
    ).rejects.toMatchObject({ code: "SERVICE_MARKET_MISMATCH" });
  });

  it("refuse une frontière ambiguë", async () => {
    resolveServiceMarketAtPoint.mockResolvedValue({
      status: "ambiguous_market",
      candidateMarketIds: ["market-abidjan", "market-bouake"],
    });

    await expect(
      validateRestaurantOrderGeography(executor, restaurant, input),
    ).rejects.toMatchObject({ code: "SERVICE_MARKET_AMBIGUOUS" });
  });

  it("refuse une capacité Restaurants suspendue", async () => {
    getServiceMarketCapability.mockResolvedValue({
      marketId: "market-abidjan",
      activityType: "restaurant",
      status: "paused",
    });

    await expect(
      validateRestaurantOrderGeography(executor, restaurant, input),
    ).rejects.toMatchObject({ code: "RESTAURANT_ACTIVITY_UNAVAILABLE" });
  });
});
