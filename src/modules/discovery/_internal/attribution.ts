import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { sql } from "drizzle-orm";
import { env } from "@/lib/env";
import { discoveryEvents } from "@/lib/db/schema";
import { db } from "@/infrastructure/db";
import { createLogger } from "@/lib/logger";
import { discoveryAttributionTokenPayloadSchema } from "../contracts";
import type {
  DiscoveryAttributionInput,
  DiscoveryEventType,
  DiscoveryPerformanceRow,
} from "../model";

const log = createLogger("discovery-attribution");
const TOKEN_LIFETIME_SECONDS = 7 * 24 * 60 * 60;

type TokenPayload = ReturnType<
  typeof discoveryAttributionTokenPayloadSchema.parse
>;

function signature(value: string) {
  return createHmac("sha256", env.JWT_SECRET)
    .update(`toutci-discovery-v1:${value}`)
    .digest("base64url");
}

function contextFingerprint(value: string) {
  return createHmac("sha256", env.JWT_SECRET)
    .update(`toutci-discovery-context-v1:${value}`)
    .digest("hex");
}

function issueToken(input: DiscoveryAttributionInput, now: Date) {
  const payload = discoveryAttributionTokenPayloadSchema.parse({
    version: 1,
    attributionId: crypto.randomUUID(),
    activityType: input.destinationPath.startsWith("/residences/")
      ? "residence"
      : "restaurant",
    resourceId: input.resourceId,
    partnerAccountId: input.partnerAccountId,
    planCode: input.planCode,
    placement: input.placement,
    contextHash: contextFingerprint(input.contextKey),
    destinationPath: input.destinationPath,
    expiresAt: Math.floor(now.getTime() / 1_000) + TOKEN_LIFETIME_SECONDS,
  });
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return { payload, token: `${encoded}.${signature(encoded)}` };
}

function readToken(token: string, now = new Date()): TokenPayload | null {
  const [encoded, receivedSignature, extra] = token.split(".");
  if (!encoded || !receivedSignature || extra) return null;
  const expectedSignature = signature(encoded);
  const received = Buffer.from(receivedSignature);
  const expected = Buffer.from(expectedSignature);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return null;
  }
  try {
    const payload = discoveryAttributionTokenPayloadSchema.parse(
      JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")),
    );
    return payload.expiresAt >= Math.floor(now.getTime() / 1_000)
      ? payload
      : null;
  } catch {
    return null;
  }
}

async function persistEvent(
  payload: TokenPayload,
  eventType: DiscoveryEventType,
  conversionReferenceId: string | null = null,
) {
  try {
    await db
      .insert(discoveryEvents)
      .values({
        attributionId: payload.attributionId,
        eventType,
        activityType: payload.activityType,
        resourceId: payload.resourceId,
        partnerAccountId: payload.partnerAccountId,
        planCode: payload.planCode,
        placement: payload.placement,
        contextHash: payload.contextHash,
        conversionReferenceId,
      })
      .onConflictDoNothing();
    return true;
  } catch (error) {
    log.warn({ error, eventType }, "Événement discovery non enregistré");
    return false;
  }
}

export async function issueDiscoveryAttributions(
  inputs: DiscoveryAttributionInput[],
) {
  const now = new Date();
  const issued = inputs.map((input) => issueToken(input, now));
  if (issued.length > 0) {
    try {
      await db
        .insert(discoveryEvents)
        .values(
          issued.map(({ payload }) => ({
            attributionId: payload.attributionId,
            eventType: "impression" as const,
            activityType: payload.activityType,
            resourceId: payload.resourceId,
            partnerAccountId: payload.partnerAccountId,
            planCode: payload.planCode,
            placement: payload.placement,
            contextHash: payload.contextHash,
            conversionReferenceId: null,
          })),
        )
        .onConflictDoNothing();
    } catch (error) {
      log.warn({ error }, "Impressions discovery non enregistrées");
    }
  }
  return new Map(
    issued.map(({ payload, token }) => [payload.resourceId, token] as const),
  );
}

export async function recordDiscoveryClick(token: string) {
  const payload = readToken(token);
  if (!payload) return null;
  await persistEvent(payload, "click");
  return payload.destinationPath;
}

export async function recordDiscoveryDetailOpen(
  token: string,
  expected?: { activityType: "restaurant" | "residence"; resourceId: string },
) {
  const payload = readToken(token);
  if (
    !payload ||
    (expected &&
      (payload.activityType !== expected.activityType ||
        payload.resourceId !== expected.resourceId))
  ) {
    return false;
  }
  return persistEvent(payload, "detail_open");
}

export async function recordDiscoveryConversion(input: {
  token?: string;
  activityType: "restaurant" | "residence";
  resourceId: string;
  conversionReferenceId: string;
}) {
  if (!input.token) return false;
  const payload = readToken(input.token);
  if (
    !payload ||
    payload.activityType !== input.activityType ||
    payload.resourceId !== input.resourceId
  ) {
    return false;
  }
  return persistEvent(payload, "conversion", input.conversionReferenceId);
}

type PerformanceRow = {
  activity_type: "restaurant" | "residence";
  plan_code: "decouverte" | "croissance" | "partenaire_fier";
  placement: "promoted" | "organic";
  impressions: number | string;
  clicks: number | string;
  detail_opens: number | string;
  conversions: number | string;
};

function executeRows<T>(result: unknown): T[] {
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

export async function getDiscoveryPerformanceRows(
  days = 30,
): Promise<DiscoveryPerformanceRow[]> {
  const result = await db.execute(sql`
    SELECT
      activity_type,
      plan_code,
      placement,
      COUNT(*) FILTER (WHERE event_type = 'impression') AS impressions,
      COUNT(*) FILTER (WHERE event_type = 'click') AS clicks,
      COUNT(*) FILTER (WHERE event_type = 'detail_open') AS detail_opens,
      COUNT(*) FILTER (WHERE event_type = 'conversion') AS conversions
    FROM discovery_events
    WHERE occurred_at >= NOW() - (${days} * INTERVAL '1 day')
    GROUP BY activity_type, plan_code, placement
    ORDER BY activity_type, plan_code, placement
  `);
  return executeRows<PerformanceRow>(result).map((row) => {
    const impressions = Number(row.impressions);
    const clicks = Number(row.clicks);
    const conversions = Number(row.conversions);
    return {
      activityType: row.activity_type,
      planCode: row.plan_code,
      placement: row.placement,
      impressions,
      clicks,
      detailOpens: Number(row.detail_opens),
      conversions,
      clickThroughRateBps: impressions
        ? Math.round((clicks * 10_000) / impressions)
        : 0,
      conversionRateBps: impressions
        ? Math.round((conversions * 10_000) / impressions)
        : 0,
    };
  });
}
