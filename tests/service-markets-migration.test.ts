import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("service markets PostGIS migration", () => {
  const migration = readFileSync(
    "drizzle/migrations/0018_service_markets_postgis.sql",
    "utf8",
  );

  it("activates PostGIS and creates versioned geographic ownership", () => {
    expect(migration).toContain("CREATE EXTENSION IF NOT EXISTS postgis");
    expect(migration).toContain("CREATE EXTENSION IF NOT EXISTS pgcrypto");
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "service_markets"');
    expect(migration).toContain(
      'CREATE TABLE IF NOT EXISTS "service_market_versions"',
    );
    expect(migration).toContain(
      'CREATE TABLE IF NOT EXISTS "service_market_capabilities"',
    );
  });

  it("audits every administrative geographic promotion", () => {
    expect(migration).toContain("service_market_created");
    expect(migration).toContain("service_market_version_created");
    expect(migration).toContain("service_market_version_published");
    expect(migration).toContain("service_market_capability_changed");
    expect(migration).toContain("geo_source_areas_imported");
  });

  it("indexes geometries and resolves boundary points with ST_Covers", () => {
    expect(migration).toMatch(/USING gist \("geometry"\)/);
    expect(migration).toContain("prevent_published_service_market_overlap");
  });

  it("adds additive vertical snapshots and delivery coherence", () => {
    expect(migration).toContain(
      'ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "service_market_id"',
    );
    expect(migration).toContain(
      'ALTER TABLE "commandes" ADD COLUMN IF NOT EXISTS "service_market_version_id"',
    );
    expect(migration).toContain("commandes_livraison_location_coherent");
  });
});
