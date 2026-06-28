import { v2 as cloudinary } from "cloudinary";
import { env } from "@/lib/env";

export function isCloudinaryConfigured(): boolean {
  if (env.CLOUDINARY_URL?.startsWith("cloudinary://")) {
    return true;
  }

  return Boolean(
    env.CLOUDINARY_CLOUD_NAME &&
      env.CLOUDINARY_API_KEY &&
      env.CLOUDINARY_API_SECRET
  );
}

export function configureCloudinary(): void {
  if (env.CLOUDINARY_URL?.startsWith("cloudinary://")) {
    cloudinary.config({ secure: true });
    return;
  }

  if (
    env.CLOUDINARY_CLOUD_NAME &&
    env.CLOUDINARY_API_KEY &&
    env.CLOUDINARY_API_SECRET
  ) {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }
}

export { cloudinary };
