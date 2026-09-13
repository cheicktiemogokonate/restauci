import "server-only";

import { and, asc, eq, isNotNull, sql } from "drizzle-orm";
import { db, transactionalDb } from "@/infrastructure/db";
import {
  creneauxHoraires,
  categories,
  partnerAccounts,
  plats,
  restaurants,
} from "@/infrastructure/db/schema";
import {
  attachPublicMediaAsset,
  releasePublicMediaAssets,
} from "@/modules/media/server";
import type {
  OpeningHoursInput,
  RestaurantUpdateInput,
} from "../contracts";

export function updateRestaurantProfileRecord(
  restaurantId: string,
  data: RestaurantUpdateInput,
  media?: {
    ownerUserId: string;
    logoAssetId?: string;
    bannerAssetId?: string;
  },
) {
  const needsMediaTransaction =
    media &&
    (media.logoAssetId ||
      media.bannerAssetId ||
      data.logoUrl !== undefined ||
      data.banniereUrl !== undefined);
  if (!needsMediaTransaction) {
    return db
      .update(restaurants)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(restaurants.id, restaurantId))
      .returning()
      .then((rows) => rows[0]);
  }

  return transactionalDb.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT id FROM ${restaurants} WHERE id = ${restaurantId} FOR UPDATE`,
    );
    const current = await tx.query.restaurants.findFirst({
      where: eq(restaurants.id, restaurantId),
      columns: { logoUrl: true, banniereUrl: true },
    });
    if (!current) throw new Error("RESTAURANT_NOT_FOUND");
    if (!media.logoAssetId && data.logoUrl && data.logoUrl !== current.logoUrl) {
      throw new Error("MEDIA_ASSET_ID_REQUIRED");
    }
    if (
      !media.bannerAssetId &&
      data.banniereUrl &&
      data.banniereUrl !== current.banniereUrl
    ) {
      throw new Error("MEDIA_ASSET_ID_REQUIRED");
    }

    const nextData: RestaurantUpdateInput = { ...data };
    if (media.logoAssetId) {
      const asset = await attachPublicMediaAsset(tx, {
        assetId: media.logoAssetId,
        ownerUserId: media.ownerUserId,
        targetType: "restaurant_logo",
        targetId: restaurantId,
      });
      nextData.logoUrl = asset.publicUrl;
      await releasePublicMediaAssets(tx, {
        targetType: "restaurant_logo",
        targetId: restaurantId,
        keepAssetIds: [asset.id],
      });
    } else if (data.logoUrl === null) {
      await releasePublicMediaAssets(tx, {
        targetType: "restaurant_logo",
        targetId: restaurantId,
      });
    }
    if (media.bannerAssetId) {
      const asset = await attachPublicMediaAsset(tx, {
        assetId: media.bannerAssetId,
        ownerUserId: media.ownerUserId,
        targetType: "restaurant_banner",
        targetId: restaurantId,
      });
      nextData.banniereUrl = asset.publicUrl;
      await releasePublicMediaAssets(tx, {
        targetType: "restaurant_banner",
        targetId: restaurantId,
        keepAssetIds: [asset.id],
      });
    } else if (data.banniereUrl === null) {
      await releasePublicMediaAssets(tx, {
        targetType: "restaurant_banner",
        targetId: restaurantId,
      });
    }

    const rows = await tx
      .update(restaurants)
      .set({ ...nextData, updatedAt: new Date() })
      .where(eq(restaurants.id, restaurantId))
      .returning();
    return rows[0];
  });
}

export function updateRestaurantServiceStateRecord(
  restaurantId: string,
  state: { enLigne: boolean; accepteCommandes: boolean },
) {
  return db
    .update(restaurants)
    .set({ ...state, updatedAt: new Date() })
    .where(eq(restaurants.id, restaurantId))
    .returning()
    .then((rows) => rows[0]);
}

export async function resubmitRestaurantRecord(
  restaurantId: string,
  userId: string,
) {
  const account = await db.query.partnerAccounts.findFirst({
    where: and(
      eq(partnerAccounts.userId, userId),
      eq(partnerAccounts.activityType, "restaurant"),
    ),
    columns: { id: true },
  });
  if (!account) return undefined;
  return db
    .update(restaurants)
    .set({ motifRejet: null, updatedAt: new Date() })
    .where(
      and(
        eq(restaurants.id, restaurantId),
        eq(restaurants.partnerAccountId, account.id),
        eq(restaurants.actif, false),
        eq(restaurants.suspendu, false),
        isNotNull(restaurants.motifRejet),
      ),
    )
    .returning()
    .then((rows) => rows[0]);
}

export function getRestaurantScheduleRecords(restaurantId: string) {
  return db.query.creneauxHoraires.findMany({
    where: eq(creneauxHoraires.restaurantId, restaurantId),
    orderBy: [
      asc(creneauxHoraires.heureOuverture),
      asc(creneauxHoraires.nom),
    ],
  });
}

export function saveRestaurantScheduleRecord(
  restaurantId: string,
  input: OpeningHoursInput,
) {
  const { id, ...data } = input;
  if (id) {
    return db
      .update(creneauxHoraires)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(creneauxHoraires.id, id),
          eq(creneauxHoraires.restaurantId, restaurantId),
        ),
      )
      .returning()
      .then((rows) => rows[0]);
  }
  return db
    .insert(creneauxHoraires)
    .values({ ...data, restaurantId })
    .returning()
    .then((rows) => rows[0]);
}

export function toggleRestaurantScheduleRecord(
  restaurantId: string,
  scheduleId: string,
  active: boolean,
) {
  return db
    .update(creneauxHoraires)
    .set({ actif: active, updatedAt: new Date() })
    .where(
      and(
        eq(creneauxHoraires.id, scheduleId),
        eq(creneauxHoraires.restaurantId, restaurantId),
      ),
    )
    .returning()
    .then((rows) => rows[0]);
}

export function deleteRestaurantScheduleRecord(
  restaurantId: string,
  scheduleId: string,
) {
  return transactionalDb.transaction(async (tx) => {
    await tx
      .update(plats)
      .set({ creneauId: null, updatedAt: new Date() })
      .where(
        and(eq(plats.restaurantId, restaurantId), eq(plats.creneauId, scheduleId)),
      );
    await tx
      .update(categories)
      .set({ creneauId: null, updatedAt: new Date() })
      .where(
        and(
          eq(categories.restaurantId, restaurantId),
          eq(categories.creneauId, scheduleId),
        ),
      );
    return tx
      .delete(creneauxHoraires)
      .where(
        and(
          eq(creneauxHoraires.id, scheduleId),
          eq(creneauxHoraires.restaurantId, restaurantId),
        ),
      )
      .returning({ id: creneauxHoraires.id });
  });
}
