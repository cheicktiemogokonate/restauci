import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("catalogue d'abonnement Résidence", () => {
  const migration = readFileSync(
    "drizzle/migrations/0020_residence_subscription_catalogue.sql",
    "utf8",
  );

  it("ajoute les quotas publics 1, 5 et illimité sans doublon", () => {
    expect(migration).toContain("WHEN 'decouverte' THEN 1");
    expect(migration).toContain("WHEN 'croissance' THEN 5");
    expect(migration).toContain("WHEN 'partenaire_fier' THEN NULL");
    expect(migration).toContain("ON CONFLICT");
    expect(migration).toContain("DO NOTHING");
  });

  it("cible exclusivement la ressource Résidence", () => {
    expect(migration).toMatch(/'residence',\s*'residence'/);
    expect(migration).toContain("catalogue Résidence incomplet");
  });

  it("expose la limite Résidence dans l'administration", () => {
    const editor = readFileSync(
      "src/components/admin/abonnements/catalogue-plan-editor.tsx",
      "utf8",
    );
    const server = readFileSync(
      "src/modules/subscriptions/server.ts",
      "utf8",
    );
    expect(editor).toContain("Résidences visibles maximum");
    expect(editor).toContain("residenceLimits");
    expect(server).toContain("activityType: \"residence\"");
    expect(server).toContain("resourceType: \"residence\"");
  });
});
