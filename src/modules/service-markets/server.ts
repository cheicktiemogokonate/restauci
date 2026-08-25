import "server-only";

import { db, type DbExecutor } from "@/infrastructure/db";
import {
  resolveServiceMarketSchema,
  createServiceMarketSchema,
  createServiceMarketVersionSchema,
  publishServiceMarketVersionSchema,
  setServiceMarketCapabilitySchema,
  type CreateServiceMarketInput,
  type CreateServiceMarketVersionInput,
  type PublishServiceMarketVersionInput,
  type ResolveServiceMarketInput,
  type SetServiceMarketCapabilityInput,
} from "./contracts";
import type { ServiceActivityType } from "./model";
import {
  getCapabilitiesInternal,
  getCapabilityInternal,
  requireActiveCapabilityInternal,
} from "./_internal/capabilities";
import {
  resolvePublishedServiceMarketAtCoordinatesInternal,
  resolvePublishedServiceMarketAtPointInternal,
} from "./_internal/resolution";
import {
  createServiceMarketInternal,
  createServiceMarketVersionInternal,
  listGeoSourceAreasInternal,
  listServiceMarketVersionFeaturesInternal,
  listServiceMarketsInternal,
  publishServiceMarketVersionInternal,
  setServiceMarketCapabilityInternal,
} from "./_internal/administration";

export async function resolveServiceMarketAtPoint(
  input: ResolveServiceMarketInput,
  options: {
    executor?: Pick<DbExecutor, "execute">;
    now?: Date;
  } = {},
) {
  const parsed = resolveServiceMarketSchema.parse(input);
  return resolvePublishedServiceMarketAtPointInternal(
    parsed,
    options.executor ?? db,
    options.now,
  );
}

export const resolvePublishedServiceMarketAtPoint = resolveServiceMarketAtPoint;

export async function resolveServiceMarketAtCoordinates(
  input: { lat: number; lng: number },
  executor: Pick<DbExecutor, "execute"> = db,
) {
  return resolvePublishedServiceMarketAtCoordinatesInternal(input, executor);
}

export async function getServiceMarketCapabilities(
  serviceMarketId: string,
  executor: Pick<DbExecutor, "execute"> = db,
) {
  return getCapabilitiesInternal(serviceMarketId, executor);
}

export async function getServiceMarketCapability(
  serviceMarketId: string,
  activityType: ServiceActivityType,
  executor: Pick<DbExecutor, "execute"> = db,
) {
  return getCapabilityInternal(serviceMarketId, activityType, executor);
}

export async function requireActiveServiceMarketCapability(
  serviceMarketId: string,
  activityType: ServiceActivityType,
  executor: Pick<DbExecutor, "execute"> = db,
) {
  return requireActiveCapabilityInternal(
    serviceMarketId,
    activityType,
    executor,
  );
}

export const listServiceMarkets = listServiceMarketsInternal;
export const listGeoSourceAreas = listGeoSourceAreasInternal;
export const listServiceMarketVersionFeatures =
  listServiceMarketVersionFeaturesInternal;

export async function createServiceMarket(input: CreateServiceMarketInput) {
  return createServiceMarketInternal(createServiceMarketSchema.parse(input));
}

export async function createServiceMarketVersion(
  input: CreateServiceMarketVersionInput,
) {
  return createServiceMarketVersionInternal(
    createServiceMarketVersionSchema.parse(input),
  );
}

export async function publishServiceMarketVersion(
  input: PublishServiceMarketVersionInput,
) {
  return publishServiceMarketVersionInternal(
    publishServiceMarketVersionSchema.parse(input),
  );
}

export async function setServiceMarketCapability(
  input: SetServiceMarketCapabilityInput,
) {
  return setServiceMarketCapabilityInternal(
    setServiceMarketCapabilitySchema.parse(input),
  );
}
