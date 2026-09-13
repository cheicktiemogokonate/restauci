import { z } from "zod";
import { PUBLIC_MEDIA_TARGET_TYPES } from "./model";

export const publicMediaAssetIdSchema = z.string().uuid();
export const publicMediaTargetTypeSchema = z.enum(PUBLIC_MEDIA_TARGET_TYPES);

export const attachPublicMediaAssetSchema = z
  .object({
    assetId: publicMediaAssetIdSchema,
    ownerUserId: z.string().min(1).max(36),
    targetType: publicMediaTargetTypeSchema,
    targetId: z.string().min(1).max(128),
  })
  .strict();

export const cleanupPublicMediaSchema = z
  .object({
    limit: z.number().int().min(1).max(500).default(100),
    now: z.date().default(() => new Date()),
  })
  .strict();

export type AttachPublicMediaAssetInput = z.infer<
  typeof attachPublicMediaAssetSchema
>;

export interface PublicMediaAssetDTO {
  id: string;
  url: string;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  sizeBytes: number;
  expiresAt: string;
}
