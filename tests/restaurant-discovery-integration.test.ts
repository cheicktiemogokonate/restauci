import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("intégration discovery Restaurant", () => {
  const persistence = readFileSync("src/modules/restaurants/_internal/search.ts", "utf8");
  const service = readFileSync("src/modules/restaurants/server.ts", "utf8");
  const map = readFileSync("src/components/client-app/restaurant-map.tsx", "utf8");

  it("filtre l’éligibilité avant de classer", () => {
    expect(persistence).toContain("eq(restaurants.actif, true)");
    expect(persistence).toContain("eq(restaurants.suspendu, false)");
    expect(persistence).toContain("eq(restaurants.serviceMarketId, serviceMarketId)");
    expect(service).toContain("rankDiscoveryPage");
  });

  it("utilise uniquement une période payante active et non expirée", () => {
    expect(persistence).toContain("period.statut = 'active'");
    expect(persistence).toContain("period.date_debut <= NOW()");
    expect(persistence).toContain("period.date_echeance > NOW()");
    expect(persistence).toContain("'decouverte'");
  });

  it("rend la mise en avant explicite côté client", () => {
    expect(map).toContain("Mis en avant");
    expect(map).toContain('restaurant.placement === "promoted"');
  });
});
