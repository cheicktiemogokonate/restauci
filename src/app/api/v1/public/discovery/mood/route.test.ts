import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const TEST_SECRET = "Unit-Test-Only-JWT-Secret-2026!Secure-Value";
let POST: typeof import("./route").POST;

beforeAll(async () => {
  vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/test");
  vi.stubEnv("JWT_SECRET", TEST_SECRET);
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://test.upstash.io");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
  vi.stubEnv("NODE_ENV", "test");
  const routeModule = await import("./route");
  POST = routeModule.POST;
});

afterAll(() => vi.unstubAllEnvs());

vi.mock("@/infrastructure/rate-limit", () => ({
  geoSearchLimiter: {},
  checkRateLimit: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/modules/discovery/server", () => ({
  searchMoodDiscovery: vi.fn().mockResolvedValue({
    items: [
      {
        id: "residence-1",
        type: "residence",
        nom: "Villa Piscine Bouaké",
        slug: "villa-piscine-bouake",
        description: "Superbe villa avec piscine entre amis",
        adresse: "Quartier Air France",
        ville: "Bouaké",
        latitude: 7.68,
        longitude: -5.02,
        distanceKm: 1.2,
        imageUrl: "https://example.com/residence.jpg",
        noteMoyenne: null,
        nombreAvis: 0,
        enLigne: true,
        prixAffiche: "45 000 FCFA / nuit",
        prixFcfa: 45000,
        tags: ["6 pers. max", "Bouaké"],
        placement: "promoted",
        partnerBadgeEnabled: true,
        discoveryToken: "token-res-xyz",
      },
    ],
    total: 1,
    page: 1,
    limit: 20,
  }),
}));

describe("POST /api/v1/public/discovery/mood", () => {
  it("rejette les requêtes avec un body manquant", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/v1/public/discovery/mood",
      {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "content-type": "application/json" },
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  it("retourne les résultats filtrés par mood et les métadonnées", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/v1/public/discovery/mood",
      {
        method: "POST",
        body: JSON.stringify({
          currentLocation: {
            lat: 7.69108,
            lng: -5.02895,
            accuracyMeters: 15,
            capturedAt: "2026-09-19T08:00:00.000Z",
          },
          mood: "entre_amis",
          query: "#piscine",
          type: "tous",
          page: 1,
          limit: 20,
        }),
        headers: { "content-type": "application/json" },
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0].nom).toBe("Villa Piscine Bouaké");
    expect(body.data.items[0].type).toBe("residence");
    expect(body.meta).toBeDefined();
    expect(body.meta.total).toBe(1);
  });
});
