import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { warmNeonTestPool } from "./support/neon-test-connection";

const enabled = process.env.RUN_SERVICE_MARKETS_DB_TESTS === "true";
const databaseUrl =
  process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL_TEST;
if (enabled && !databaseUrl) {
  throw new Error(
    "TEST_DATABASE_URL est obligatoire pour les tests DB Service Markets.",
  );
}
const describeDb = enabled ? describe : describe.skip;

describeDb("service markets PostGIS invariants", () => {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 1,
    connectionTimeoutMillis: 30_000,
    idleTimeoutMillis: 60_000,
    keepAlive: true,
  });
  const adminId = crypto.randomUUID();
  const marketId = crypto.randomUUID();
  const versionId = crypto.randomUUID();
  const overlapMarketId = crypto.randomUUID();
  const overlapVersionId = crypto.randomUUID();

  beforeAll(async () => {
    await warmNeonTestPool(pool);
    await pool.query(
      `INSERT INTO users (id, nom, email, password, telephone, role, created_at, updated_at)
       VALUES ($1, 'Admin Geo Test', $2, 'x', $3, 'admin', NOW(), NOW())`,
      [
        adminId,
        `admin-geo-${adminId}@example.test`,
        `+225${adminId.replaceAll("-", "").slice(0, 10)}`,
      ],
    );
    await pool.query(
      `INSERT INTO service_markets (id, code, name, country_code, status)
       VALUES ($1, $2, 'Marché test', 'CI', 'draft')`,
      [marketId, `CI-TEST-${marketId.slice(0, 8)}`],
    );
    await pool.query(
      `INSERT INTO service_market_versions (
        id, service_market_id, version, geometry, geometry_checksum,
        source_manifest, created_by_user_id, published_at
       ) VALUES (
        $1, $2, 1,
        ST_Multi(ST_GeomFromText('POLYGON((-6.8 4.6,-6.6 4.6,-6.6 4.8,-6.8 4.8,-6.8 4.6))', 4326)),
        $3, '{"fixture":true}'::jsonb, $4, NOW()
       )`,
      [versionId, marketId, "a".repeat(64), adminId],
    );
    await pool.query(
      `UPDATE service_markets
       SET status='published', active_version_id=$2, published_at=NOW(), updated_at=NOW()
       WHERE id=$1`,
      [marketId, versionId],
    );
    await pool.query(
      `INSERT INTO service_market_capabilities (
        service_market_id, activity_type, status, activated_at
       ) VALUES ($1, 'restaurant', 'active', NOW())`,
      [marketId],
    );
  }, 60_000);

  afterAll(async () => {
    await pool.query(
      "UPDATE service_markets SET status='draft', active_version_id=NULL, published_at=NULL WHERE id = ANY($1::uuid[])",
      [[marketId, overlapMarketId]],
    );
    await pool.query(
      "DELETE FROM service_market_capabilities WHERE service_market_id = ANY($1::uuid[])",
      [[marketId, overlapMarketId]],
    );
    await pool.query(
      "DELETE FROM service_market_versions WHERE id = ANY($1::uuid[])",
      [[versionId, overlapVersionId]],
    );
    await pool.query(
      "DELETE FROM service_markets WHERE id = ANY($1::uuid[])",
      [[marketId, overlapMarketId]],
    );
    await pool.query("DELETE FROM users WHERE id=$1", [adminId]);
    await pool.end();
  }, 60_000);

  it("covers interior and exact boundary points", async () => {
    const result = await pool.query(
      `SELECT
        ST_Covers(geometry, ST_SetSRID(ST_MakePoint(-6.7, 4.7), 4326)) AS interior,
        ST_Covers(geometry, ST_SetSRID(ST_MakePoint(-6.8, 4.6), 4326)) AS boundary
       FROM service_market_versions WHERE id=$1`,
      [versionId],
    );
    expect(result.rows[0]).toMatchObject({ interior: true, boundary: true });
  });

  it("refuses an overlapping published market", async () => {
    await pool.query(
      `INSERT INTO service_markets (id, code, name, country_code, status)
       VALUES ($1, $2, 'Chevauchement test', 'CI', 'draft')`,
      [overlapMarketId, `CI-OVERLAP-${overlapMarketId.slice(0, 8)}`],
    );
    await pool.query(
      `INSERT INTO service_market_versions (
        id, service_market_id, version, geometry, geometry_checksum,
        source_manifest, created_by_user_id, published_at
       ) VALUES (
        $1, $2, 1,
        ST_Multi(ST_GeomFromText('POLYGON((-6.7 4.7,-6.5 4.7,-6.5 4.9,-6.7 4.9,-6.7 4.7))', 4326)),
        $3, '{"fixture":true}'::jsonb, $4, NOW()
       )`,
      [overlapVersionId, overlapMarketId, "b".repeat(64), adminId],
    );
    await expect(
      pool.query(
        `UPDATE service_markets
         SET status='published', active_version_id=$2, published_at=NOW()
         WHERE id=$1`,
        [overlapMarketId, overlapVersionId],
      ),
    ).rejects.toThrow(/SERVICE_MARKET_OVERLAP/);
  });
});
