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
  searchEtablissements: vi.fn().mockResolvedValue({
    items: [
      {
        id: "resto-1",
        type: "restaurant",
        nom: "Chez Bouaké",
        slug: "chez-bouake",
        description: "Bon repas",
        adresse: "Commerce",
        ville: "Bouaké",
        latitude: 7.69,
        longitude: -5.03,
        distanceKm: 0.8,
        imageUrl: "https://example.com/logo.jpg",
        noteMoyenne: 4.5,
        nombreAvis: 10,
        enLigne: true,
        prixAffiche: "Min. 1 000 FCFA",
        prixFcfa: 1000,
        tags: ["Ivoirien"],
        placement: "organic",
        partnerBadgeEnabled: false,
        discoveryToken: "token-abc",
      },
    ],
    total: 1,
    page: 1,
    limit: 50,
  }),
}));

describe("POST /api/v1/public/etablissements/search", () => {
  it("rejette les requêtes avec un body manquant ou invalide", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/v1/public/etablissements/search",
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

  it("retourne les établissements et les métadonnées de pagination avec une position valide", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/v1/public/etablissements/search",
      {
        method: "POST",
        body: JSON.stringify({
          currentLocation: {
            lat: 7.69108,
            lng: -5.02895,
            accuracyMeters: 15,
            capturedAt: "2026-09-19T08:00:00.000Z",
          },
          type: "tous",
          page: 1,
          limit: 50,
        }),
        headers: { "content-type": "application/json" },
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0].nom).toBe("Chez Bouaké");
    expect(body.meta).toBeDefined();
    expect(body.meta.total).toBe(1);
    expect(body.meta.page).toBe(1);
  });
});
