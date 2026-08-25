import { writeFileSync } from "node:fs";
import { Pool } from "pg";

type MatchRow = {
  restaurant_id: string;
  restaurant_name: string;
  market_ids: string[];
  market_codes: string[];
  version_ids: string[];
};

const apply = process.argv.includes("--apply");
const reportIndex = process.argv.indexOf("--report");
const reportPath = reportIndex >= 0 ? process.argv[reportIndex + 1] : undefined;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL est obligatoire.");
if (apply && process.env.CONFIRM_GEO_BACKFILL !== "APPLY") {
  throw new Error(
    "Définissez CONFIRM_GEO_BACKFILL=APPLY pour autoriser les écritures.",
  );
}

const pool = new Pool({ connectionString: databaseUrl, max: 2 });

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

async function main() {
  const result = await pool.query<MatchRow>(`
    SELECT
      restaurant.id AS restaurant_id,
      restaurant.nom AS restaurant_name,
      COALESCE(array_agg(market.id::text ORDER BY market.code)
        FILTER (WHERE market.id IS NOT NULL), ARRAY[]::text[]) AS market_ids,
      COALESCE(array_agg(market.code ORDER BY market.code)
        FILTER (WHERE market.id IS NOT NULL), ARRAY[]::text[]) AS market_codes,
      COALESCE(array_agg(version.id::text ORDER BY market.code)
        FILTER (WHERE version.id IS NOT NULL), ARRAY[]::text[]) AS version_ids
    FROM restaurants AS restaurant
    LEFT JOIN service_market_versions AS version
      ON ST_Covers(
        version.geometry,
        ST_SetSRID(ST_MakePoint(restaurant.longitude, restaurant.latitude), 4326)
      )
      AND version.published_at IS NOT NULL
      AND version.retired_at IS NULL
    LEFT JOIN service_markets AS market
      ON market.active_version_id = version.id
      AND market.status = 'published'
    GROUP BY restaurant.id, restaurant.nom
    ORDER BY restaurant.id
  `);

  const report = result.rows.map((row) => {
    const status =
      row.market_ids.length === 1
        ? "assigned"
        : row.market_ids.length === 0
          ? "outside_published_market"
          : "ambiguous";
    return {
      restaurantId: row.restaurant_id,
      restaurantName: row.restaurant_name,
      status,
      marketId: row.market_ids.length === 1 ? row.market_ids[0] : null,
      marketCode: row.market_codes.length === 1 ? row.market_codes[0] : null,
      versionId: row.version_ids.length === 1 ? row.version_ids[0] : null,
    };
  });

  const csv = [
    "restaurant_id,restaurant_name,status,market_code",
    ...report.map((row) =>
      [
        csvCell(row.restaurantId),
        csvCell(row.restaurantName),
        csvCell(row.status),
        csvCell(row.marketCode ?? ""),
      ].join(","),
    ),
  ].join("\n");
  if (reportPath) writeFileSync(reportPath, `${csv}\n`, "utf8");

  const counts = report.reduce<Record<string, number>>((accumulator, row) => {
    accumulator[row.status] = (accumulator[row.status] ?? 0) + 1;
    return accumulator;
  }, {});
  console.log(
    JSON.stringify(
      {
        mode: apply ? "apply" : "dry-run",
        total: report.length,
        assigned: counts.assigned ?? 0,
        outsidePublishedMarket: counts.outside_published_market ?? 0,
        ambiguous: counts.ambiguous ?? 0,
        reportPath: reportPath ?? null,
      },
      null,
      2,
    ),
  );

  if (!apply) return;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const row of report) {
      await client.query(
        `UPDATE restaurants SET
          service_market_id=$2::uuid,
          service_market_version_id=$3::uuid,
          geo_assignment_status=$4::geo_assignment_status,
          geo_assigned_at=CASE WHEN $4='assigned' THEN NOW() ELSE NULL END,
          updated_at=NOW()
         WHERE id=$1`,
        [row.restaurantId, row.marketId, row.versionId, row.status],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

try {
  await main();
} finally {
  await pool.end();
}
