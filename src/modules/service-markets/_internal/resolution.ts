import "server-only";

import { db, type DbExecutor } from "@/infrastructure/db";
import { createLogger } from "@/infrastructure/logger";
import type { ResolveServiceMarketInput } from "../contracts";
import {
  validateLocationSample,
  type ServiceMarketResolution,
} from "../model";
import { findPublishedMarketsCoveringPoint } from "./persistence";

const log = createLogger("service-market-resolution");

function observed(
  result: ServiceMarketResolution,
  startedAt: number,
  use: "discovery" | "checkout" | "service-address",
) {
  const context = {
    outcome: result.status,
    use,
    durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
    ...(result.status === "resolved"
      ? { marketId: result.market.id, versionId: result.market.versionId }
      : {}),
  };
  if (result.status === "ambiguous_market") {
    log.warn(context, "Résolution géographique ambiguë");
  } else {
    log.info(context, "Résolution géographique terminée");
  }
  return result;
}

type CoveringRow = Awaited<
  ReturnType<typeof findPublishedMarketsCoveringPoint>
>[number];

function toResolved(row: CoveringRow): ServiceMarketResolution {
  return {
    status: "resolved",
    market: {
      id: row.market_id,
      code: row.market_code,
      name: row.market_name,
      countryCode: row.country_code,
      versionId: row.version_id,
      version: row.version,
    },
  };
}

export async function resolvePublishedServiceMarketAtPointInternal(
  input: ResolveServiceMarketInput,
  executor: Pick<DbExecutor, "execute"> = db,
  now = new Date(),
): Promise<ServiceMarketResolution> {
  const startedAt = performance.now();
  const invalid = validateLocationSample(input, input.use, now);
  if (invalid) return observed(invalid, startedAt, input.use);

  const rows = await findPublishedMarketsCoveringPoint(executor, input);
  if (rows.length === 0) {
    return observed({ status: "unserved_area" }, startedAt, input.use);
  }
  if (rows.length > 1) {
    return observed({ status: "ambiguous_market" }, startedAt, input.use);
  }
  const [row] = rows;
  if (
    row.boundary_distance_meters !== null &&
    input.accuracyMeters > row.boundary_distance_meters
  ) {
    return observed({
      status: "imprecise_location",
      maxAccuracyMeters: Math.max(1, Math.floor(row.boundary_distance_meters)),
    }, startedAt, input.use);
  }
  return observed(toResolved(row), startedAt, input.use);
}

export async function resolvePublishedServiceMarketAtCoordinatesInternal(
  input: { lat: number; lng: number },
  executor: Pick<DbExecutor, "execute"> = db,
): Promise<ServiceMarketResolution> {
  const startedAt = performance.now();
  if (
    !Number.isFinite(input.lat) ||
    !Number.isFinite(input.lng) ||
    input.lat < -90 ||
    input.lat > 90 ||
    input.lng < -180 ||
    input.lng > 180
  ) {
    return observed(
      { status: "invalid_coordinates" },
      startedAt,
      "service-address",
    );
  }

  const rows = await findPublishedMarketsCoveringPoint(executor, input);
  if (rows.length === 0) {
    return observed(
      { status: "unserved_area" },
      startedAt,
      "service-address",
    );
  }
  if (rows.length > 1) {
    return observed(
      { status: "ambiguous_market" },
      startedAt,
      "service-address",
    );
  }

  const [row] = rows;
  return observed(toResolved(row), startedAt, "service-address");
}
