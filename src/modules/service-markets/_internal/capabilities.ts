import "server-only";

import { db, type DbExecutor } from "@/infrastructure/db";
import {
  isServiceMarketCapabilityActive,
  ServiceMarketError,
  type ServiceActivityType,
} from "../model";
import {
  findServiceMarketCapabilities,
  findServiceMarketCapability,
} from "./persistence";

export async function getCapabilitiesInternal(
  serviceMarketId: string,
  executor: Pick<DbExecutor, "execute"> = db,
) {
  return findServiceMarketCapabilities(executor, serviceMarketId);
}

export async function getCapabilityInternal(
  serviceMarketId: string,
  activityType: ServiceActivityType,
  executor: Pick<DbExecutor, "execute"> = db,
) {
  return findServiceMarketCapability(executor, serviceMarketId, activityType);
}

export async function requireActiveCapabilityInternal(
  serviceMarketId: string,
  activityType: ServiceActivityType,
  executor: Pick<DbExecutor, "execute"> = db,
) {
  const capability = await getCapabilityInternal(
    serviceMarketId,
    activityType,
    executor,
  );
  if (!capability) {
    throw new ServiceMarketError(
      "SERVICE_MARKET_CAPABILITY_NOT_FOUND",
      "Cette activité n'est pas configurée dans ce marché.",
      { serviceMarketId, activityType },
    );
  }
  if (!isServiceMarketCapabilityActive(capability.status)) {
    throw new ServiceMarketError(
      "SERVICE_MARKET_CAPABILITY_INACTIVE",
      "Cette activité n'est pas disponible dans ce marché actuellement.",
      { serviceMarketId, activityType, status: capability.status },
    );
  }
  return capability;
}
