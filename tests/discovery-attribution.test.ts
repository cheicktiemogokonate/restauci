import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { discoveryAttributionTokenPayloadSchema } from "@/modules/discovery/contracts";
import { createRestaurantOrderSchema } from "@/modules/orders/contracts";
import { createResidenceReservationSchema } from "@/modules/residences/contracts";

const token = "a".repeat(40);

describe("attribution discovery", () => {
  it("accepte uniquement les destinations internes prévues", () => {
    const base = {
      version: 1 as const,
      attributionId: "00000000-0000-4000-8000-000000000001",
      activityType: "residence" as const,
      resourceId: "00000000-0000-4000-8000-000000000002",
      partnerAccountId: "00000000-0000-4000-8000-000000000003",
      planCode: "croissance" as const,
      placement: "promoted" as const,
      contextHash: "a".repeat(64),
      expiresAt: 2_000_000_000,
    };
    expect(
      discoveryAttributionTokenPayloadSchema.parse({
        ...base,
        destinationPath: "/residences/villa-lagune",
      }).destinationPath,
    ).toBe("/residences/villa-lagune");
    expect(() =>
      discoveryAttributionTokenPayloadSchema.parse({
        ...base,
        destinationPath: "https://example.com/collect",
      }),
    ).toThrow("Destination discovery invalide");
  });

  it("propage un jeton optionnel jusqu’aux deux conversions", () => {
    expect(
      createRestaurantOrderSchema.safeParse({
        restaurantSlug: "chez-toutci",
        modeCommande: "emporter",
        paymentMethod: "cash",
        items: [
          {
            platId: "00000000-0000-4000-8000-000000000004",
            quantite: 1,
          },
        ],
        idempotencyKey: "00000000-0000-4000-8000-000000000005",
        discoveryToken: token,
      }).success,
    ).toBe(true);
    expect(
      createResidenceReservationSchema.safeParse({
        residenceId: "00000000-0000-4000-8000-000000000006",
        checkIn: "2026-09-10",
        checkOut: "2026-09-12",
        guests: 2,
        paymentMethod: "card",
        discoveryToken: token,
      }).success,
    ).toBe(true);
  });

  it("raccorde impression, clic, ouverture et conversion sans identité client", () => {
    const attribution = readFileSync(
      "src/modules/discovery/_internal/attribution.ts",
      "utf8",
    );
    const restaurantRoute = readFileSync(
      "src/app/api/v1/client/commandes/route.ts",
      "utf8",
    );
    const residenceService = readFileSync(
      "src/modules/residences/server.ts",
      "utf8",
    );
    expect(attribution).toContain('eventType: "impression"');
    expect(attribution).toContain('persistEvent(payload, "click")');
    expect(attribution).toContain('persistEvent(payload, "detail_open")');
    expect(attribution).toContain('persistEvent(payload, "conversion"');
    expect(attribution).not.toContain("clientId");
    expect(attribution).not.toContain("currentLocation");
    expect(attribution).toContain("payload.expiresAt >=");
    expect(attribution).toContain("TOKEN_LIFETIME_SECONDS");
    expect(restaurantRoute).toContain("recordDiscoveryConversion");
    expect(residenceService).toContain("recordDiscoveryConversion");
  });
});

describe("migration discovery attribution", () => {
  const migration = readFileSync(
    "drizzle/migrations/0026_discovery_attribution.sql",
    "utf8",
  );

  it("rend les événements idempotents et indexe le reporting", () => {
    expect(migration).toContain("discovery_events_attribution_event_unique");
    expect(migration).toContain("discovery_events_reporting_idx");
    expect(migration).toContain("discovery_events_conversion_reference_unique");
    expect(migration).toContain("discovery_events_conversion_reference_valid");
    expect(migration).toContain('"partner_account_id" uuid NOT NULL');
  });
});
