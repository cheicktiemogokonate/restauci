export const PUBLIC_MEDIA_ASSET_STATUSES = [
  "temporary",
  "attached",
  "deleting",
  "deleted",
] as const;

export type PublicMediaAssetStatus =
  (typeof PUBLIC_MEDIA_ASSET_STATUSES)[number];

export const PUBLIC_MEDIA_TARGET_TYPES = [
  "restaurant_logo",
  "restaurant_banner",
  "dish_photo",
  "residence_photo",
] as const;

export type PublicMediaTargetType =
  (typeof PUBLIC_MEDIA_TARGET_TYPES)[number];

export const PUBLIC_MEDIA_TEMPORARY_RETENTION_HOURS = 24;

export function getPublicMediaExpiration(createdAt: Date): Date {
  return new Date(
    createdAt.getTime() +
      PUBLIC_MEDIA_TEMPORARY_RETENTION_HOURS * 60 * 60 * 1_000,
  );
}

export function isPublicMediaExpired(expiresAt: Date, now: Date): boolean {
  return expiresAt.getTime() <= now.getTime();
}

export class PublicMediaError extends Error {
  constructor(
    public readonly code:
      | "MEDIA_ASSET_NOT_FOUND"
      | "MEDIA_ASSET_NOT_ATTACHABLE"
      | "MEDIA_ASSET_EXPIRED"
      | "MEDIA_STORAGE_UNAVAILABLE",
    message: string,
  ) {
    super(message);
    this.name = "PublicMediaError";
  }
}
