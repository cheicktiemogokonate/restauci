import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("outillage opérationnel Service Markets", () => {
  it("valide une fixture GeoJSON sans dépendance réseau", () => {
    const output = execFileSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "scripts/geo/validate-boundaries.ts",
        "--geojson",
        "scripts/geo/fixtures/two-test-areas.geojson",
        "--country",
        "CI",
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: { ...process.env, NODE_NO_WARNINGS: "1" },
      },
    );
    expect(JSON.parse(output)).toMatchObject({
      valid: true,
      countryCode: "CI",
      featureCount: 2,
    });
  });

  it("conserve les garde-fous dry-run et confirmations explicites", () => {
    const importSource = readFileSync("scripts/geo/import-boundaries.ts", "utf8");
    const backfillSource = readFileSync(
      "scripts/geo/backfill-restaurant-markets.ts",
      "utf8",
    );
    expect(importSource).toContain("CONFIRM_GEO_IMPORT");
    expect(importSource).toContain('client.query("ROLLBACK")');
    expect(backfillSource).toContain("CONFIRM_GEO_BACKFILL");
  });
});
