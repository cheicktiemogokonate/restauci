import "server-only";

import { and, eq, inArray, lte, or, sql } from "drizzle-orm";
import { db } from "@/infrastructure/db";
import { publicMediaAssets } from "@/infrastructure/db/schema";
import type {
  DbExecutor,
  TransactionExecutor,
} from "@/infrastructure/db";
import type { AttachPublicMediaAssetInput } from "../contracts";
import {
  getPublicMediaExpiration,
  PublicMediaError,
  type PublicMediaTargetType,
} from "../model";

export async function persistTemporaryPublicMediaAsset(input: {
  id: string;
  ownerUserId: string;
  storageKey: string;
  publicUrl: string;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  sizeBytes: number;
  sha256: string;
  createdAt: Date;
}) {
  const [asset] = await db
    .insert(publicMediaAssets)
    .values({
      ...input,
      status: "temporary",
      expiresAt: getPublicMediaExpiration(input.createdAt),
      updatedAt: input.createdAt,
    })
    .returning();
  if (!asset) throw new Error("MEDIA_ASSET_PERSISTENCE_FAILED");
  return asset;
}

export async function attachPublicMediaAssetRecord(
  tx: TransactionExecutor,
  input: AttachPublicMediaAssetInput,
) {
  await tx.execute(
    sql`SELECT id FROM ${publicMediaAssets} WHERE id = ${input.assetId} FOR UPDATE`,
  );
  const asset = await tx.query.publicMediaAssets.findFirst({
    where: and(
      eq(publicMediaAssets.id, input.assetId),
      eq(publicMediaAssets.ownerUserId, input.ownerUserId),
    ),
  });
  if (!asset) {
    throw new PublicMediaError(
      "MEDIA_ASSET_NOT_FOUND",
      "L’image envoyée est introuvable ou ne vous appartient pas.",
    );
  }
  if (
    asset.status === "attached" &&
    asset.targetType === input.targetType &&
    asset.targetId === input.targetId
  ) {
    return asset;
  }
  if (asset.status !== "temporary") {
    throw new PublicMediaError(
      "MEDIA_ASSET_NOT_ATTACHABLE",
      "Cette image est déjà rattachée ou en cours de suppression.",
    );
  }
  if (!asset.expiresAt || asset.expiresAt <= new Date()) {
    throw new PublicMediaError(
      "MEDIA_ASSET_EXPIRED",
      "Cette image temporaire a expiré. Envoyez-la de nouveau.",
    );
  }
  const [attached] = await tx
    .update(publicMediaAssets)
    .set({
      status: "attached",
      targetType: input.targetType,
      targetId: input.targetId,
      attachedAt: new Date(),
      expiresAt: null,
      updatedAt: new Date(),
    })
    .where(eq(publicMediaAssets.id, asset.id))
    .returning();
  if (!attached) throw new Error("MEDIA_ASSET_ATTACHMENT_FAILED");
  return attached;
}

export async function releasePublicMediaAssetsRecord(
  tx: TransactionExecutor,
  input: {
    targetType: PublicMediaTargetType;
    targetId: string;
    keepAssetIds?: readonly string[];
    releasedAt?: Date;
  },
) {
  const releasedAt = input.releasedAt ?? new Date();
  const conditions = [
    eq(publicMediaAssets.status, "attached" as const),
    eq(publicMediaAssets.targetType, input.targetType),
    eq(publicMediaAssets.targetId, input.targetId),
  ];
  if (input.keepAssetIds?.length) {
    conditions.push(
      sql`${publicMediaAssets.id} NOT IN (${sql.join(
        input.keepAssetIds.map((id) => sql`${id}`),
        sql`, `,
      )})`,
    );
  }
  return tx
    .update(publicMediaAssets)
    .set({
      status: "temporary",
      targetType: null,
      targetId: null,
      attachedAt: null,
      expiresAt: getPublicMediaExpiration(releasedAt),
      updatedAt: releasedAt,
    })
    .where(and(...conditions))
    .returning({ id: publicMediaAssets.id });
}

export async function findAttachedPublicMediaAssetByUrl(
  executor: DbExecutor,
  input: {
    publicUrl: string;
    ownerUserId: string;
    targetType: PublicMediaTargetType;
    targetId: string;
  },
) {
  return executor.query.publicMediaAssets.findFirst({
    where: and(
      eq(publicMediaAssets.publicUrl, input.publicUrl),
      eq(publicMediaAssets.ownerUserId, input.ownerUserId),
      eq(publicMediaAssets.status, "attached"),
      eq(publicMediaAssets.targetType, input.targetType),
      eq(publicMediaAssets.targetId, input.targetId),
    ),
  });
}

export async function claimExpiredPublicMediaAssets(input: {
  now: Date;
  limit: number;
}) {
  const result = await db.execute(sql`
    WITH candidates AS (
      SELECT id
      FROM public_media_assets
      WHERE (
        status = 'temporary'
        AND expires_at <= ${input.now}
      ) OR (
        status = 'deleting'
        AND updated_at <= ${new Date(input.now.getTime() - 15 * 60 * 1_000)}
      )
      ORDER BY expires_at, id
      LIMIT ${input.limit}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE public_media_assets AS asset
    SET status = 'deleting', updated_at = ${input.now}
    FROM candidates
    WHERE asset.id = candidates.id
    RETURNING asset.id, asset.storage_key
  `);
  return result.rows as unknown as Array<{ id: string; storage_key: string }>;
}

export async function markPublicMediaAssetsDeleted(ids: string[], now: Date) {
  if (ids.length === 0) return;
  await db
    .update(publicMediaAssets)
    .set({ status: "deleted", deletedAt: now, updatedAt: now })
    .where(
      and(
        inArray(publicMediaAssets.id, ids),
        eq(publicMediaAssets.status, "deleting"),
      ),
    );
}

export async function retryPublicMediaAssetDeletion(id: string, now: Date) {
  await db
    .update(publicMediaAssets)
    .set({
      status: "temporary",
      expiresAt: new Date(now.getTime() + 15 * 60 * 1_000),
      updatedAt: now,
    })
    .where(
      and(
        eq(publicMediaAssets.id, id),
        or(
          eq(publicMediaAssets.status, "deleting"),
          and(
            eq(publicMediaAssets.status, "temporary"),
            lte(publicMediaAssets.expiresAt, now),
          ),
        ),
      ),
    );
}
