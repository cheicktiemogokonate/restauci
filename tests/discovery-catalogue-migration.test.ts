import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("migration du catalogue discovery", () => {
  const migration = readFileSync(
    "drizzle/migrations/0024_discovery_catalogue.sql",
    "utf8",
  );
  const schema = readFileSync("src/lib/db/schema.ts", "utf8");

  it("crée les projections runtime et l'historique administrable", () => {
    for (const table of [
      "subscription_plan_exposure_benefits",
      "subscription_plan_feature_items",
      "discovery_policy_settings",
      "subscription_catalogue_draft",
      "subscription_catalogue_revisions",
    ]) {
      expect(migration).toContain(`CREATE TABLE IF NOT EXISTS \"${table}\"`);
      expect(schema).toContain(`\"${table}\"`);
    }
  });

  it("borne les paramètres d'exposition au niveau PostgreSQL", () => {
    expect(migration).toContain('"exposure_weight" BETWEEN 1 AND 100');
    expect(migration).toContain('"sponsored_share_bps" BETWEEN 0 AND 5000');
    expect(migration).toContain(
      '"rotation_window_minutes" BETWEEN 15 AND 10080',
    );
    expect(migration).toContain(
      '"max_promoted_per_partner" BETWEEN 1 AND 10',
    );
    expect(migration).toContain('CHECK ("id" = 1)');
  });

  it("indexe toutes les clés étrangères et les lectures runtime", () => {
    for (const index of [
      "subscription_plan_exposure_benefits_plan_idx",
      "subscription_plan_exposure_benefits_activity_weight_idx",
      "subscription_plan_feature_items_plan_activity_idx",
      "discovery_policy_settings_updated_by_idx",
      "subscription_catalogue_draft_updated_by_idx",
      "subscription_catalogue_revisions_published_by_idx",
    ]) {
      expect(migration).toContain(`\"${index}\"`);
    }
  });

  it("initialise les poids validés et les deux politiques d'activité", () => {
    expect(migration).toContain("WHEN 'decouverte' THEN 1");
    expect(migration).toContain("WHEN 'croissance' THEN 3");
    expect(migration).toContain("WHEN 'partenaire_fier' THEN 6");
    expect(migration).toContain("('restaurant', true, 2500, 1440, 1)");
    expect(migration).toContain("('residence', true, 2500, 1440, 1)");
  });

  it("est relançable sans dupliquer les données initiales", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS");
    expect(migration).toContain("CREATE INDEX IF NOT EXISTS");
    expect(migration).toContain('ON CONFLICT ("activity_type") DO NOTHING');
    expect(migration).toContain(
      'ON CONFLICT ("plan_id", "activity_type") DO NOTHING',
    );
    expect(migration).toContain(
      'ON CONFLICT ("plan_id", "activity_type", "sort_order") DO NOTHING',
    );
  });
});
