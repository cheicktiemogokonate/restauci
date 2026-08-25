import "server-only";

import { sql } from "drizzle-orm";
import type { DbExecutor } from "@/infrastructure/db";
import type {
  ServiceActivityType,
  ServiceMarketCapabilityStatus,
} from "../model";

type ResolutionRow = {
  market_id: string;
  market_code: string;
  market_name: string;
  country_code: string;
  version_id: string;
  version: number;
  boundary_distance_meters: number | string | null;
};

type CapabilityRow = {
  activityType: ServiceActivityType;
  status: ServiceMarketCapabilityStatus;
};

export function rowsFromExecuteResult<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (
    typeof result === "object" &&
    result !== null &&
    "rows" in result &&
    Array.isArray(result.rows)
  ) {
    return result.rows as T[];
  }
  return [];
}

export async function findPublishedMarketsCoveringPoint(
  executor: Pick<DbExecutor, "execute">,
  input: { lat: number; lng: number },
): Promise<Array<ResolutionRow & { boundary_distance_meters: number | null }>> {
  const result = await executor.execute(sql`
    SELECT
      market.id AS market_id,
      market.code AS market_code,
      market.name AS market_name,
      market.country_code,
      version.id AS version_id,
      version.version,
      ST_Distance(
        ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326)::geography,
        ST_Boundary(version.geometry)::geography
      ) AS boundary_distance_meters
    FROM service_markets AS market
    INNER JOIN service_market_versions AS version
      ON version.id = market.active_version_id
    WHERE market.status = 'published'
      AND version.published_at IS NOT NULL
      AND version.retired_at IS NULL
      AND ST_Covers(
        version.geometry,
        ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326)
      )
    ORDER BY market.code
    LIMIT 2
  `);

  return rowsFromExecuteResult<ResolutionRow>(result).map((row) => ({
    ...row,
    version: Number(row.version),
    boundary_distance_meters:
      row.boundary_distance_meters === null
        ? null
        : Number(row.boundary_distance_meters),
  }));
}

export async function findServiceMarketCapabilities(
  executor: Pick<DbExecutor, "execute">,
  serviceMarketId: string,
): Promise<CapabilityRow[]> {
  const result = await executor.execute(sql`
    SELECT activity_type AS "activityType", status
    FROM service_market_capabilities
    WHERE service_market_id = ${serviceMarketId}::uuid
    ORDER BY activity_type
  `);
  return rowsFromExecuteResult<CapabilityRow>(result);
}

export async function findServiceMarketCapability(
  executor: Pick<DbExecutor, "execute">,
  serviceMarketId: string,
  activityType: ServiceActivityType,
): Promise<CapabilityRow | null> {
  const result = await executor.execute(sql`
    SELECT activity_type AS "activityType", status
    FROM service_market_capabilities
    WHERE service_market_id = ${serviceMarketId}::uuid
      AND activity_type = ${activityType}::service_activity_type
    LIMIT 1
  `);
  return rowsFromExecuteResult<CapabilityRow>(result)[0] ?? null;
}
