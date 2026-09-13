import "server-only";

export {
  ACCEPTED_IMAGE_TYPES,
  detectImageType,
  MAX_IMAGE_SIZE,
  sanitizeImage,
  validateImageType,
} from "./_internal/image";
export type {
  SanitizedImage,
  ValidatedImage,
} from "./_internal/image";

import { createHash, randomUUID } from "node:crypto";
import type { TransactionExecutor } from "@/infrastructure/db";
import {
  deleteImageFromR2,
  isR2Configured,
  uploadImageToR2,
} from "@/infrastructure/storage/r2";
import {
  attachPublicMediaAssetSchema,
  cleanupPublicMediaSchema,
  type AttachPublicMediaAssetInput,
  type PublicMediaAssetDTO,
} from "./contracts";
import {
  PublicMediaError,
  type PublicMediaTargetType,
} from "./model";
import {
  attachPublicMediaAssetRecord,
  claimExpiredPublicMediaAssets,
  findAttachedPublicMediaAssetByUrl,
  markPublicMediaAssetsDeleted,
  persistTemporaryPublicMediaAsset,
  releasePublicMediaAssetsRecord,
  retryPublicMediaAssetDeletion,
} from "./_internal/persistence";

export async function createTemporaryPublicMediaAsset(input: {
  ownerUserId: string;
  body: Buffer;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  extension: "jpg" | "png" | "webp";
}): Promise<PublicMediaAssetDTO> {
  if (!isR2Configured()) {
    throw new PublicMediaError(
      "MEDIA_STORAGE_UNAVAILABLE",
      "Le stockage public des images n’est pas configuré.",
    );
  }
  const id = randomUUID();
  const createdAt = new Date();
  const stored = await uploadImageToR2({
    body: input.body,
    contentType: input.contentType,
    extension: input.extension,
    ownerId: input.ownerUserId,
    assetId: id,
  });
  try {
    const asset = await persistTemporaryPublicMediaAsset({
      id,
      ownerUserId: input.ownerUserId,
      storageKey: stored.key,
      publicUrl: stored.url,
      contentType: input.contentType,
      sizeBytes: input.body.length,
      sha256: createHash("sha256").update(input.body).digest("hex"),
      createdAt,
    });
    return {
      id: asset.id,
      url: asset.publicUrl,
      contentType: asset.contentType,
      sizeBytes: asset.sizeBytes,
      expiresAt: asset.expiresAt!.toISOString(),
    };
  } catch (error) {
    await deleteImageFromR2(stored.key).catch(() => undefined);
    throw error;
  }
}

export function attachPublicMediaAsset(
  tx: TransactionExecutor,
  input: AttachPublicMediaAssetInput,
) {
  return attachPublicMediaAssetRecord(
    tx,
    attachPublicMediaAssetSchema.parse(input),
  );
}

export function releasePublicMediaAssets(
  tx: TransactionExecutor,
  input: {
    targetType: PublicMediaTargetType;
    targetId: string;
    keepAssetIds?: readonly string[];
  },
) {
  return releasePublicMediaAssetsRecord(tx, input);
}

export function getAttachedPublicMediaAssetByUrl(
  tx: TransactionExecutor,
  input: {
    publicUrl: string;
    ownerUserId: string;
    targetType: PublicMediaTargetType;
    targetId: string;
  },
) {
  return findAttachedPublicMediaAssetByUrl(tx, input);
}

export async function cleanupAbandonedPublicMediaAssets(
  input: { limit?: number; now?: Date } = {},
) {
  const parsed = cleanupPublicMediaSchema.parse(input);
  const claimed = await claimExpiredPublicMediaAssets(parsed);
  const deleted: string[] = [];
  const failed: string[] = [];
  for (const asset of claimed) {
    try {
      await deleteImageFromR2(asset.storage_key);
      deleted.push(asset.id);
    } catch {
      failed.push(asset.id);
      await retryPublicMediaAssetDeletion(asset.id, parsed.now);
    }
  }
  await markPublicMediaAssetsDeleted(deleted, parsed.now);
  return { claimed: claimed.length, deleted: deleted.length, failed: failed.length };
}

export { isR2Configured };
