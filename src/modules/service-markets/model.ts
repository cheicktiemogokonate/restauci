import type { LocationSample } from "@/shared/geo";

export type { LocationSample } from "@/shared/geo";

export const SERVICE_MARKET_STATUSES = [
  "draft",
  "published",
  "archived",
] as const;

export const SERVICE_MARKET_CAPABILITY_STATUSES = [
  "disabled",
  "prelaunch",
  "active",
  "paused",
] as const;

export const SERVICE_ACTIVITY_TYPES = [
  "restaurant",
  "residence",
  "event",
] as const;

export const GEO_ASSIGNMENT_STATUSES = [
  "assigned",
  "outside_published_market",
  "ambiguous",
  "pending_review",
] as const;

export const GEO_SOURCE_TYPES = ["osm"] as const;
export const GEO_SOURCE_OBJECT_TYPES = ["relation"] as const;
export const SERVICE_MARKET_AREA_OPERATIONS = ["include", "exclude"] as const;
export const LOCATION_CONTEXTS = [
  "currentLocation",
  "destinationLocation",
  "serviceLocation",
] as const;
export const LOCATION_POLICY_USES = ["discovery", "checkout"] as const;

export type ServiceMarketStatus = (typeof SERVICE_MARKET_STATUSES)[number];
export type ServiceMarketCapabilityStatus =
  (typeof SERVICE_MARKET_CAPABILITY_STATUSES)[number];
export type ServiceActivityType = (typeof SERVICE_ACTIVITY_TYPES)[number];
export type GeoAssignmentStatus = (typeof GEO_ASSIGNMENT_STATUSES)[number];
export type LocationContext = (typeof LOCATION_CONTEXTS)[number];
export type LocationPolicyUse = (typeof LOCATION_POLICY_USES)[number];

export const LOCATION_POLICIES = {
  discovery: { maxAgeMs: 15 * 60_000, maxAccuracyMeters: 1_000 },
  checkout: { maxAgeMs: 5 * 60_000, maxAccuracyMeters: 500 },
} as const satisfies Record<
  LocationPolicyUse,
  { maxAgeMs: number; maxAccuracyMeters: number }
>;

export interface ResolvedServiceMarket {
  id: string;
  code: string;
  name: string;
  countryCode: string;
  versionId: string;
  version: number;
}

export type ServiceMarketResolution =
  | { status: "resolved"; market: ResolvedServiceMarket }
  | { status: "invalid_coordinates" }
  | { status: "stale_location"; maxAgeMs: number }
  | { status: "imprecise_location"; maxAccuracyMeters: number }
  | { status: "unserved_area" }
  | { status: "ambiguous_market" };

export type ServiceMarketErrorCode =
  | "SERVICE_MARKET_NOT_FOUND"
  | "SERVICE_MARKET_VERSION_NOT_FOUND"
  | "SERVICE_MARKET_NOT_PUBLISHED"
  | "SERVICE_MARKET_CAPABILITY_NOT_FOUND"
  | "SERVICE_MARKET_CAPABILITY_INACTIVE"
  | "SERVICE_MARKET_OVERLAP"
  | "SERVICE_MARKET_INVALID_GEOMETRY"
  | "SERVICE_MARKET_VERSION_CONFLICT"
  | "GEO_SOURCE_AREA_NOT_FOUND"
  | "SERVICE_MARKET_PUBLISH_REQUIRED";

export class ServiceMarketError extends Error {
  constructor(
    public readonly code: ServiceMarketErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ServiceMarketError";
  }
}

export function validateLocationSample(
  input: LocationSample,
  use: LocationPolicyUse,
  now = new Date(),
): Exclude<ServiceMarketResolution, { status: "resolved" | "unserved_area" | "ambiguous_market" }> | null {
  if (
    !Number.isFinite(input.lat) ||
    !Number.isFinite(input.lng) ||
    input.lat < -90 ||
    input.lat > 90 ||
    input.lng < -180 ||
    input.lng > 180 ||
    !Number.isFinite(input.accuracyMeters) ||
    input.accuracyMeters < 0
  ) {
    return { status: "invalid_coordinates" };
  }

  const capturedAtMs = Date.parse(input.capturedAt);
  if (!Number.isFinite(capturedAtMs) || capturedAtMs > now.getTime() + 60_000) {
    return { status: "invalid_coordinates" };
  }

  const policy = LOCATION_POLICIES[use];
  if (now.getTime() - capturedAtMs > policy.maxAgeMs) {
    return { status: "stale_location", maxAgeMs: policy.maxAgeMs };
  }
  if (input.accuracyMeters > policy.maxAccuracyMeters) {
    return {
      status: "imprecise_location",
      maxAccuracyMeters: policy.maxAccuracyMeters,
    };
  }
  return null;
}

export function isServiceMarketCapabilityActive(
  status: ServiceMarketCapabilityStatus,
): boolean {
  return status === "active";
}
