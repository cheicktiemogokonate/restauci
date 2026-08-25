import { readFileSync } from "node:fs";
import { Pool, type PoolClient } from "pg";

type Manifest = {
  schemaVersion: 1;
  countryCode: string;
  snapshotDate: string;
  sourceUrl: string;
  sha256: string;
  reviewedBy: string;
  reviewedAt: string;
};

type Feature = {
  type: "Feature";
  properties?: Record<string, unknown>;
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: unknown };
};

type FeatureCollection = { type: "FeatureCollection"; features: Feature[] };

function argument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function requiredArgument(name: string) {
  const value = argument(name);
  if (!value) throw new Error(`${name} est obligatoire.`);
  return value;
}

function relationRef(properties: Record<string, unknown>) {
  const raw = properties.source_ref ?? properties["@id"] ?? properties.id;
  const ref = String(raw ?? "").replace(/^relation\//, "");
  if (!/^\d+$/.test(ref)) throw new Error(`Référence OSM relation invalide : ${String(raw)}`);
  return ref;
}

function normalizeGeometry(geometry: Feature["geometry"]) {
  return geometry.type === "Polygon"
    ? { type: "MultiPolygon", coordinates: [geometry.coordinates] }
    : geometry;
}

async function createStage(client: PoolClient) {
  await client.query(`
    CREATE TEMP TABLE geo_source_areas_stage (
      source_ref text NOT NULL,
      source_version text NOT NULL,
      name text NOT NULL,
      name_local text,
      country_code text NOT NULL,
      admin_level text,
      tags jsonb NOT NULL,
      geometry geometry(MultiPolygon, 4326) NOT NULL,
      geometry_checksum text NOT NULL,
      source_updated_at timestamptz
    ) ON COMMIT DROP
  `);
}

const apply = process.argv.includes("--apply");
const geojsonPath = requiredArgument("--geojson");
const manifestPath = requiredArgument("--manifest");
const adminId = argument("--admin-id");
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL est obligatoire.");
if (apply && process.env.CONFIRM_GEO_IMPORT !== "APPLY") {
  throw new Error("Définissez CONFIRM_GEO_IMPORT=APPLY pour autoriser la promotion.");
}
if (apply && !adminId) throw new Error("--admin-id est obligatoire en mode apply.");

const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Manifest;
if (
  manifest.schemaVersion !== 1 ||
  !/^[A-Z]{2}$/.test(manifest.countryCode) ||
  !/^\d{4}-\d{2}-\d{2}$/.test(manifest.snapshotDate) ||
  !manifest.reviewedBy ||
  !manifest.reviewedAt ||
  manifest.sourceUrl.includes("latest")
) {
  throw new Error("Manifeste incomplet, non daté ou non approuvé.");
}
const collection = JSON.parse(readFileSync(geojsonPath, "utf8")) as FeatureCollection;
if (collection.type !== "FeatureCollection" || collection.features.length === 0) {
  throw new Error("FeatureCollection vide ou invalide.");
}

const pool = new Pool({ connectionString: databaseUrl, max: 1 });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await createStage(client);
  for (const feature of collection.features) {
    if (!feature.geometry || !["Polygon", "MultiPolygon"].includes(feature.geometry.type)) {
      throw new Error("Chaque unité doit être un Polygon ou MultiPolygon.");
    }
    const properties = feature.properties ?? {};
    const name = String(properties.name ?? "").trim();
    if (!name) throw new Error("Chaque unité doit avoir un nom.");
    const geometry = normalizeGeometry(feature.geometry);
    await client.query(
      `INSERT INTO geo_source_areas_stage (
        source_ref, source_version, name, name_local, country_code,
        admin_level, tags, geometry, geometry_checksum, source_updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7::jsonb,
        ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON($8), 4326)), 3))::geometry(MultiPolygon, 4326),
        '', $9
      )`,
      [
        relationRef(properties),
        String(properties.osm_version ?? manifest.snapshotDate),
        name,
        typeof properties["name:fr"] === "string" ? properties["name:fr"] : null,
        manifest.countryCode,
        properties.admin_level ? String(properties.admin_level) : null,
        JSON.stringify(properties),
        JSON.stringify(geometry),
        properties.timestamp ? String(properties.timestamp) : null,
      ],
    );
  }
  await client.query(`
    UPDATE geo_source_areas_stage
    SET geometry_checksum = encode(digest(ST_AsEWKB(geometry), 'sha256'), 'hex')
  `);
  const quality = await client.query<{
    invalid_count: string;
    empty_count: string;
    duplicate_count: string;
  }>(`
    SELECT
      COUNT(*) FILTER (WHERE NOT ST_IsValid(geometry)) AS invalid_count,
      COUNT(*) FILTER (WHERE ST_IsEmpty(geometry)) AS empty_count,
      COUNT(*) - COUNT(DISTINCT (source_ref, source_version)) AS duplicate_count
    FROM geo_source_areas_stage
  `);
  const checks = quality.rows[0];
  if (
    Number(checks.invalid_count) > 0 ||
    Number(checks.empty_count) > 0 ||
    Number(checks.duplicate_count) > 0
  ) {
    throw new Error(`Contrôles staging en échec : ${JSON.stringify(checks)}`);
  }
  const comparison = await client.query<{
    state: "new" | "unchanged" | "conflict";
    count: string;
  }>(`
    SELECT CASE
      WHEN existing.id IS NULL THEN 'new'
      WHEN existing.geometry_checksum = stage.geometry_checksum THEN 'unchanged'
      ELSE 'conflict'
    END AS state, COUNT(*)::text AS count
    FROM geo_source_areas_stage stage
    LEFT JOIN geo_source_areas existing
      ON existing.source = 'osm'
      AND existing.source_ref = stage.source_ref
      AND existing.source_version = stage.source_version
    GROUP BY state
    ORDER BY state
  `);
  const report = Object.fromEntries(comparison.rows.map((row) => [row.state, Number(row.count)]));
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", manifest, report }, null, 2));
  if ((report.conflict ?? 0) > 0) {
    throw new Error("Une même version OSM possède un checksum différent : corrigez le manifeste.");
  }
  if (!apply) {
    await client.query("ROLLBACK");
  } else {
    await client.query(`
      INSERT INTO geo_source_areas (
        source, source_type, source_ref, source_version, name, name_local,
        country_code, admin_level, tags, geometry, geometry_checksum,
        source_updated_at, imported_at
      )
      SELECT 'osm', 'relation', stage.source_ref, stage.source_version,
        stage.name, stage.name_local, stage.country_code, stage.admin_level,
        stage.tags, stage.geometry, stage.geometry_checksum,
        stage.source_updated_at, NOW()
      FROM geo_source_areas_stage stage
      ON CONFLICT (source, source_ref, source_version) DO NOTHING
    `);
    await client.query(
      `INSERT INTO audit_log (
         id, admin_id, action, ressource_type, ressource_id, details, created_at
       ) VALUES (
         gen_random_uuid()::text, $1, 'geo_source_areas_imported',
         'geo_source_import', gen_random_uuid()::text, $2::jsonb, NOW()
       )`,
      [adminId, JSON.stringify({ manifest, report })],
    );
    await client.query("COMMIT");
  }
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  client.release();
  await pool.end();
}
