"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminSession } from "@/modules/auth/server";
import { cacheKey, invalidateCacheByPattern } from "@/infrastructure/cache";
import {
  createServiceMarket,
  createServiceMarketVersion,
  publishServiceMarketVersion,
  setServiceMarketCapability,
} from "@/modules/service-markets/server";
import {
  createServiceMarketSchema,
  createServiceMarketVersionSchema,
  publishServiceMarketVersionSchema,
  setServiceMarketCapabilitySchema,
} from "@/modules/service-markets/contracts";
import { ServiceMarketError } from "@/modules/service-markets/model";
import { createLogger } from "@/infrastructure/logger";

type ActionResult = { success: true } | { success: false; error: string };
const log = createLogger("admin-service-markets");

function actionError(error: unknown, operation: string): ActionResult {
	log.error({ err: error, operation }, "Échec de la commande Service Market");
  if (error instanceof ServiceMarketError) {
    return { success: false, error: error.message };
  }
  if (error instanceof z.ZodError) {
    return {
      success: false,
      error: error.issues[0]?.message ?? "Données géographiques invalides.",
    };
  }
  return {
    success: false,
    error: "L'opération géographique a échoué. Consultez les journaux serveur.",
  };
}

async function refreshServiceMarketViews() {
  await invalidateCacheByPattern(cacheKey.restaurantsPublicMarketsPattern());
  revalidatePath("/admin/zones");
  revalidatePath("/client");
}

export async function createServiceMarketAction(input: {
  code: string;
  name: string;
  countryCode: string;
}): Promise<ActionResult> {
  const admin = await getAdminSession();
  try {
    await createServiceMarket(
      createServiceMarketSchema.parse({ ...input, adminId: admin.userId }),
    );
    await refreshServiceMarketViews();
    return { success: true };
  } catch (error) {
    return actionError(error, "create-market");
  }
}

export async function createServiceMarketVersionAction(input: {
  serviceMarketId: string;
  includeSourceAreaIds: string[];
  excludeSourceAreaIds?: string[];
}): Promise<ActionResult> {
  const admin = await getAdminSession();
  try {
    await createServiceMarketVersion(
      createServiceMarketVersionSchema.parse({
        ...input,
        excludeSourceAreaIds: input.excludeSourceAreaIds ?? [],
        adminId: admin.userId,
      }),
    );
    await refreshServiceMarketViews();
    return { success: true };
  } catch (error) {
    return actionError(error, "create-version");
  }
}

export async function publishServiceMarketVersionAction(input: {
  serviceMarketId: string;
  serviceMarketVersionId: string;
}): Promise<ActionResult> {
  const admin = await getAdminSession();
  try {
    await publishServiceMarketVersion(
      publishServiceMarketVersionSchema.parse({
        ...input,
        adminId: admin.userId,
      }),
    );
    await refreshServiceMarketViews();
    return { success: true };
  } catch (error) {
    return actionError(error, "publish-version");
  }
}

export async function setServiceMarketCapabilityAction(input: {
  serviceMarketId: string;
  activityType: "restaurant" | "residence" | "event";
  status: "disabled" | "prelaunch" | "active" | "paused";
}): Promise<ActionResult> {
  const admin = await getAdminSession();
  try {
    await setServiceMarketCapability(
      setServiceMarketCapabilitySchema.parse({
        ...input,
        adminId: admin.userId,
      }),
    );
    await refreshServiceMarketViews();
    return { success: true };
  } catch (error) {
    return actionError(error, "set-capability");
  }
}
