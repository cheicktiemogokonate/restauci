import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { persistAuditLog } from "@/modules/audit/server";
import {
  geoSourceAreas,
  serviceMarketCapabilities,
  serviceMarkets,
  serviceMarketVersionAreas,
  serviceMarketVersions,
} from "@/infrastructure/db/schema";
import { db, transactionalDb } from "@/infrastructure/db";
import type {
  CreateServiceMarketInput,
  CreateServiceMarketVersionInput,
  PublishServiceMarketVersionInput,
  SetServiceMarketCapabilityInput,
} from "../contracts";
import { SERVICE_ACTIVITY_TYPES, ServiceMarketError } from "../model";
import { rowsFromExecuteResult } from "./persistence";

type LockedMarketRow = {
  id: string;
  status: "draft" | "published" | "archived";
  active_version_id: string | null;
};

type LockedVersionRow = {
  id: string;
  service_market_id: string;
  version: number;
  geometry_checksum: string;
  published_at: Date | null;
  retired_at: Date | null;
};

function unique(values: string[]) {
  return [...new Set(values)];
}

function uuidArray(values: string[]) {
  if (values.length === 0) return sql`ARRAY[]::uuid[]`;
  return sql`ARRAY[${sql.join(
    values.map((value) => sql`${value}::uuid`),
    sql`, `,
  )}]::uuid[]`;
}

function translatePostgisError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("SERVICE_MARKET_OVERLAP")) {
    throw new ServiceMarketError(
      "SERVICE_MARKET_OVERLAP",
      "Cette frontière chevauche un autre marché déjà publié.",
    );
  }
  if (message.includes("service_market_versions_market_version_unique")) {
    throw new ServiceMarketError(
      "SERVICE_MARKET_VERSION_CONFLICT",
      "Une autre version a été créée simultanément. Réessayez.",
    );
  }
  throw error;
}

export async function listServiceMarketsInternal() {
  const [markets, capabilities, versions, versionAreas] = await Promise.all([
    db
      .select()
      .from(serviceMarkets)
      .orderBy(asc(serviceMarkets.countryCode), asc(serviceMarkets.name)),
    db
      .select()
      .from(serviceMarketCapabilities)
      .orderBy(asc(serviceMarketCapabilities.activityType)),
    db
      .select()
      .from(serviceMarketVersions)
      .orderBy(asc(serviceMarketVersions.version)),
    db
      .select({
        serviceMarketVersionId:
          serviceMarketVersionAreas.serviceMarketVersionId,
        geoSourceAreaId: serviceMarketVersionAreas.geoSourceAreaId,
        operation: serviceMarketVersionAreas.operation,
        sourceArea: geoSourceAreas,
      })
      .from(serviceMarketVersionAreas)
      .innerJoin(
        geoSourceAreas,
        eq(serviceMarketVersionAreas.geoSourceAreaId, geoSourceAreas.id),
      ),
  ]);

  return markets.map((market) => ({
    ...market,
    capabilities: capabilities.filter(
      (capability) => capability.serviceMarketId === market.id,
    ),
    versions: versions
      .filter((version) => version.serviceMarketId === market.id)
      .map((version) => ({
        ...version,
        areas: versionAreas
          .filter((area) => area.serviceMarketVersionId === version.id)
          .map((area) => ({
            serviceMarketVersionId: area.serviceMarketVersionId,
            geoSourceAreaId: area.geoSourceAreaId,
            operation: area.operation,
            sourceArea: area.sourceArea,
          })),
      })),
  }));
}

export async function listGeoSourceAreasInternal(countryCode?: string) {
  return db
    .select()
    .from(geoSourceAreas)
    .where(
      countryCode
        ? eq(geoSourceAreas.countryCode, countryCode.toUpperCase())
        : undefined,
    )
    .orderBy(asc(geoSourceAreas.countryCode), asc(geoSourceAreas.name));
}

export async function listServiceMarketVersionFeaturesInternal(
  countryCode?: string,
) {
  const result = await db.execute(sql`
    SELECT
      version.id AS version_id,
      market.id AS market_id,
      market.name AS market_name,
      version.version,
      (market.active_version_id = version.id) AS active,
      ST_AsGeoJSON(version.geometry)::json AS geometry,
      (
        SELECT COUNT(*)::int
        FROM restaurants restaurant
        WHERE ST_Covers(
          version.geometry,
          ST_SetSRID(ST_MakePoint(restaurant.longitude, restaurant.latitude), 4326)
        )
      ) AS restaurants_inside,
      (
        SELECT COUNT(*)::int
        FROM restaurants restaurant
        WHERE restaurant.actif = true
          AND restaurant.suspendu = false
          AND restaurant.service_market_id IS DISTINCT FROM market.id
          AND ST_Covers(
            version.geometry,
            ST_SetSRID(ST_MakePoint(restaurant.longitude, restaurant.latitude), 4326)
          )
      ) AS assignments_to_review,
      (
        SELECT COUNT(*)::int
        FROM restaurants restaurant
        WHERE restaurant.service_market_id = market.id
          AND NOT ST_Covers(
            version.geometry,
            ST_SetSRID(ST_MakePoint(restaurant.longitude, restaurant.latitude), 4326)
          )
      ) AS restaurants_leaving
    FROM service_market_versions version
    INNER JOIN service_markets market ON market.id = version.service_market_id
    WHERE version.retired_at IS NULL
      AND (${countryCode ?? null}::text IS NULL OR market.country_code = ${countryCode?.toUpperCase() ?? null})
    ORDER BY market.name, version.version
  `);
  return rowsFromExecuteResult<{
    version_id: string;
    market_id: string;
    market_name: string;
    version: number;
    active: boolean;
    geometry: GeoJSON.MultiPolygon;
    restaurants_inside: number | string;
    assignments_to_review: number | string;
    restaurants_leaving: number | string;
  }>(result).map((row) => ({
    versionId: row.version_id,
    marketId: row.market_id,
    marketName: row.market_name,
    version: Number(row.version),
    active: row.active,
    geometry: row.geometry,
    restaurantsInside: Number(row.restaurants_inside),
    assignmentsToReview: Number(row.assignments_to_review),
    restaurantsLeaving: Number(row.restaurants_leaving),
  }));
}

export async function createServiceMarketInternal(
  input: CreateServiceMarketInput,
) {
  return transactionalDb.transaction(async (tx) => {
    const now = new Date();
    const [market] = await tx
      .insert(serviceMarkets)
      .values({
        code: input.code,
        name: input.name,
        countryCode: input.countryCode,
        updatedAt: now,
      })
      .returning();
    if (!market) throw new Error("Création du marché impossible.");

    await tx.insert(serviceMarketCapabilities).values(
      SERVICE_ACTIVITY_TYPES.map((activityType) => ({
        serviceMarketId: market.id,
        activityType,
        status: "disabled" as const,
        updatedAt: now,
      })),
    );
    await persistAuditLog(tx, {
      adminId: input.adminId,
      action: "service_market_created",
      ressourceType: "service_market",
      ressourceId: market.id,
      details: {
        code: market.code,
        name: market.name,
        countryCode: market.countryCode,
      },
    });
    return market;
  });
}

export async function createServiceMarketVersionInternal(
  input: CreateServiceMarketVersionInput,
) {
  const includeIds = unique(input.includeSourceAreaIds);
  const excludeIds = unique(input.excludeSourceAreaIds);
  const allIds = unique([...includeIds, ...excludeIds]);

  try {
    return await transactionalDb.transaction(async (tx) => {
      const marketResult = await tx.execute(sql`
        SELECT id, status, active_version_id
        FROM service_markets
        WHERE id = ${input.serviceMarketId}::uuid
        FOR UPDATE
      `);
      const market = rowsFromExecuteResult<LockedMarketRow>(marketResult)[0];
      if (!market) {
        throw new ServiceMarketError(
          "SERVICE_MARKET_NOT_FOUND",
          "Marché de service introuvable.",
        );
      }
      if (market.status === "archived") {
        throw new ServiceMarketError(
          "SERVICE_MARKET_VERSION_CONFLICT",
          "Un marché archivé ne peut plus recevoir de version.",
        );
      }

      const areasResult = await tx.execute(sql`
        SELECT id::text AS id
        FROM geo_source_areas
        WHERE id = ANY(${uuidArray(allIds)})
      `);
      const foundIds = new Set(
        rowsFromExecuteResult<{ id: string }>(areasResult).map((row) => row.id),
      );
      const missingIds = allIds.filter((id) => !foundIds.has(id));
      if (missingIds.length > 0) {
        throw new ServiceMarketError(
          "GEO_SOURCE_AREA_NOT_FOUND",
          "Certaines unités géographiques importées sont introuvables.",
          { missingIds },
        );
      }

      const versionResult = await tx.execute(sql`
        WITH next_version AS (
          SELECT COALESCE(MAX(version), 0) + 1 AS value
          FROM service_market_versions
          WHERE service_market_id = ${input.serviceMarketId}::uuid
        ),
        included AS (
          SELECT ST_UnaryUnion(ST_Collect(geometry)) AS geometry
          FROM geo_source_areas
          WHERE id = ANY(${uuidArray(includeIds)})
        ),
        excluded AS (
          SELECT ST_UnaryUnion(ST_Collect(geometry)) AS geometry
          FROM geo_source_areas
          WHERE id = ANY(${uuidArray(excludeIds)})
        ),
        composed AS (
          SELECT ST_Multi(ST_CollectionExtract(ST_MakeValid(
            CASE
              WHEN excluded.geometry IS NULL THEN included.geometry
              ELSE ST_Difference(included.geometry, excluded.geometry)
            END
          ), 3))::geometry(MultiPolygon, 4326) AS geometry
          FROM included, excluded
        )
        INSERT INTO service_market_versions (
          service_market_id,
          version,
          geometry,
          geometry_checksum,
          source_manifest,
          created_by_user_id
        )
        SELECT
          ${input.serviceMarketId}::uuid,
          next_version.value,
          composed.geometry,
          encode(digest(ST_AsEWKB(composed.geometry), 'sha256'), 'hex'),
          ${JSON.stringify({
            source: "osm",
            includeSourceAreaIds: includeIds,
            excludeSourceAreaIds: excludeIds,
          })}::jsonb,
          ${input.adminId}
        FROM next_version, composed
        WHERE composed.geometry IS NOT NULL
          AND NOT ST_IsEmpty(composed.geometry)
          AND ST_IsValid(composed.geometry)
        RETURNING id, service_market_id, version, geometry_checksum,
          published_at, retired_at
      `);
      const version = rowsFromExecuteResult<LockedVersionRow>(versionResult)[0];
      if (!version) {
        throw new ServiceMarketError(
          "SERVICE_MARKET_INVALID_GEOMETRY",
          "Les unités sélectionnées ne produisent pas une frontière valide.",
        );
      }

      await tx.insert(serviceMarketVersionAreas).values([
        ...includeIds.map((geoSourceAreaId) => ({
          serviceMarketVersionId: version.id,
          geoSourceAreaId,
          operation: "include" as const,
        })),
        ...excludeIds.map((geoSourceAreaId) => ({
          serviceMarketVersionId: version.id,
          geoSourceAreaId,
          operation: "exclude" as const,
        })),
      ]);
      await persistAuditLog(tx, {
        adminId: input.adminId,
        action: "service_market_version_created",
        ressourceType: "service_market_version",
        ressourceId: version.id,
        details: {
          serviceMarketId: input.serviceMarketId,
          version: version.version,
          geometryChecksum: version.geometry_checksum,
          includeSourceAreaIds: includeIds,
          excludeSourceAreaIds: excludeIds,
        },
      });
      return version;
    });
  } catch (error) {
    return translatePostgisError(error);
  }
}

export async function publishServiceMarketVersionInternal(
  input: PublishServiceMarketVersionInput,
) {
  try {
    return await transactionalDb.transaction(async (tx) => {
      const marketResult = await tx.execute(sql`
        SELECT id, status, active_version_id
        FROM service_markets
        WHERE id = ${input.serviceMarketId}::uuid
        FOR UPDATE
      `);
      const market = rowsFromExecuteResult<LockedMarketRow>(marketResult)[0];
      if (!market) {
        throw new ServiceMarketError(
          "SERVICE_MARKET_NOT_FOUND",
          "Marché de service introuvable.",
        );
      }
      const versionResult = await tx.execute(sql`
        SELECT id, service_market_id, version, geometry_checksum,
          published_at, retired_at
        FROM service_market_versions
        WHERE id = ${input.serviceMarketVersionId}::uuid
        FOR UPDATE
      `);
      const version = rowsFromExecuteResult<LockedVersionRow>(versionResult)[0];
      if (!version || version.service_market_id !== market.id) {
        throw new ServiceMarketError(
          "SERVICE_MARKET_VERSION_NOT_FOUND",
          "Version de frontière introuvable pour ce marché.",
        );
      }
      if (market.status === "archived" || version.retired_at) {
        throw new ServiceMarketError(
          "SERVICE_MARKET_VERSION_CONFLICT",
          "Cette version ne peut plus être publiée.",
        );
      }
      if (
        market.status === "published" &&
        market.active_version_id === version.id &&
        version.published_at
      ) {
        return version;
      }

      const qualityResult = await tx.execute(sql`
        SELECT
          ST_IsValid(geometry) AS valid,
          NOT ST_IsEmpty(geometry) AS non_empty,
          ST_Area(geometry::geography) AS area_square_meters
        FROM service_market_versions
        WHERE id = ${version.id}::uuid
      `);
      const quality = rowsFromExecuteResult<{
        valid: boolean;
        non_empty: boolean;
        area_square_meters: number | string;
      }>(qualityResult)[0];
      if (
        !quality?.valid ||
        !quality.non_empty ||
        Number(quality.area_square_meters) <= 0
      ) {
        throw new ServiceMarketError(
          "SERVICE_MARKET_INVALID_GEOMETRY",
          "La frontière ne passe pas les contrôles PostGIS.",
        );
      }

      const overlapResult = await tx.execute(sql`
        SELECT other_market.id
        FROM service_markets AS other_market
        INNER JOIN service_market_versions AS other_version
          ON other_version.id = other_market.active_version_id
        INNER JOIN service_market_versions AS candidate
          ON candidate.id = ${version.id}::uuid
        WHERE other_market.id <> ${market.id}::uuid
          AND other_market.status = 'published'
          AND ST_Intersects(other_version.geometry, candidate.geometry)
          AND NOT ST_Touches(other_version.geometry, candidate.geometry)
        LIMIT 1
      `);
      if (rowsFromExecuteResult(overlapResult).length > 0) {
        throw new ServiceMarketError(
          "SERVICE_MARKET_OVERLAP",
          "Cette frontière chevauche un autre marché déjà publié.",
        );
      }

      const now = new Date();
      if (market.active_version_id && market.active_version_id !== version.id) {
        await tx
          .update(serviceMarketVersions)
          .set({ retiredAt: now })
          .where(eq(serviceMarketVersions.id, market.active_version_id));
      }
      await tx
        .update(serviceMarketVersions)
        .set({ publishedAt: version.published_at ?? now, retiredAt: null })
        .where(eq(serviceMarketVersions.id, version.id));
      const [publishedMarket] = await tx
        .update(serviceMarkets)
        .set({
          status: "published",
          activeVersionId: version.id,
          publishedAt: now,
          archivedAt: null,
          updatedAt: now,
        })
        .where(eq(serviceMarkets.id, market.id))
        .returning();
      await persistAuditLog(tx, {
        adminId: input.adminId,
        action: "service_market_version_published",
        ressourceType: "service_market_version",
        ressourceId: version.id,
        details: {
          serviceMarketId: market.id,
          version: version.version,
          previousVersionId: market.active_version_id,
          geometryChecksum: version.geometry_checksum,
          areaSquareMeters: Number(quality.area_square_meters),
        },
      });
      return publishedMarket;
    });
  } catch (error) {
    return translatePostgisError(error);
  }
}

export async function setServiceMarketCapabilityInternal(
  input: SetServiceMarketCapabilityInput,
) {
  return transactionalDb.transaction(async (tx) => {
    const [market] = await tx
      .select({ id: serviceMarkets.id, status: serviceMarkets.status })
      .from(serviceMarkets)
      .where(eq(serviceMarkets.id, input.serviceMarketId))
      .limit(1);
    if (!market) {
      throw new ServiceMarketError(
        "SERVICE_MARKET_NOT_FOUND",
        "Marché de service introuvable.",
      );
    }
    if (input.status === "active" && market.status !== "published") {
      throw new ServiceMarketError(
        "SERVICE_MARKET_PUBLISH_REQUIRED",
        "Publiez une frontière avant d'activer cette activité.",
      );
    }
    const previous = await tx.query.serviceMarketCapabilities.findFirst({
      where: and(
        eq(serviceMarketCapabilities.serviceMarketId, input.serviceMarketId),
        eq(serviceMarketCapabilities.activityType, input.activityType),
      ),
    });
    const now = new Date();
    const lifecycle = {
      ...(input.status === "prelaunch" ? { prelaunchAt: now } : {}),
      ...(input.status === "active" ? { activatedAt: now } : {}),
      ...(input.status === "paused" ? { pausedAt: now } : {}),
    };
    const [capability] = await tx
      .insert(serviceMarketCapabilities)
      .values({
        serviceMarketId: input.serviceMarketId,
        activityType: input.activityType,
        status: input.status,
        updatedAt: now,
        ...lifecycle,
      })
      .onConflictDoUpdate({
        target: [
          serviceMarketCapabilities.serviceMarketId,
          serviceMarketCapabilities.activityType,
        ],
        set: { status: input.status, updatedAt: now, ...lifecycle },
      })
      .returning();
    if (!capability) throw new Error("Mise à jour de la capacité impossible.");
    await persistAuditLog(tx, {
      adminId: input.adminId,
      action: "service_market_capability_changed",
      ressourceType: "service_market",
      ressourceId: input.serviceMarketId,
      details: {
        activityType: input.activityType,
        previousStatus: previous?.status ?? null,
        status: input.status,
      },
    });
    return capability;
  });
}
