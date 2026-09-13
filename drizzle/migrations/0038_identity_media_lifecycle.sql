DO $$ BEGIN
  CREATE TYPE "public"."public_media_asset_status" AS ENUM(
    'temporary', 'attached', 'deleting', 'deleted'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."public_media_target_type" AS ENUM(
    'restaurant_logo', 'restaurant_banner', 'dish_photo', 'residence_photo'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public_media_assets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_user_id" varchar(36) NOT NULL,
  "storage_key" text NOT NULL,
  "public_url" text NOT NULL,
  "content_type" varchar(50) NOT NULL,
  "size_bytes" integer NOT NULL,
  "sha256" varchar(64) NOT NULL,
  "status" "public_media_asset_status" DEFAULT 'temporary' NOT NULL,
  "target_type" "public_media_target_type",
  "target_id" varchar(128),
  "expires_at" timestamp with time zone,
  "attached_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "public_media_assets_storage_key_unique" UNIQUE("storage_key"),
  CONSTRAINT "public_media_assets_public_url_unique" UNIQUE("public_url"),
  CONSTRAINT "public_media_assets_content_type_valid" CHECK ("content_type" IN ('image/jpeg', 'image/png', 'image/webp')),
  CONSTRAINT "public_media_assets_size_valid" CHECK ("size_bytes" > 0 AND "size_bytes" <= 5242880),
  CONSTRAINT "public_media_assets_sha256_valid" CHECK ("sha256" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "public_media_assets_lifecycle_coherent" CHECK (
    ("status" = 'temporary' AND "target_type" IS NULL AND "target_id" IS NULL AND "expires_at" IS NOT NULL AND "attached_at" IS NULL AND "deleted_at" IS NULL)
    OR ("status" = 'attached' AND "target_type" IS NOT NULL AND "target_id" IS NOT NULL AND "expires_at" IS NULL AND "attached_at" IS NOT NULL AND "deleted_at" IS NULL)
    OR ("status" = 'deleting' AND "target_type" IS NULL AND "target_id" IS NULL AND "expires_at" IS NOT NULL AND "attached_at" IS NULL AND "deleted_at" IS NULL)
    OR ("status" = 'deleted' AND "target_type" IS NULL AND "target_id" IS NULL AND "attached_at" IS NULL AND "deleted_at" IS NOT NULL)
  )
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "public_media_assets"
    ADD CONSTRAINT "public_media_assets_owner_user_id_users_id_fk"
    FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id")
    ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "public_media_assets_cleanup_idx"
  ON "public_media_assets" USING btree ("expires_at", "id")
  WHERE "status" IN ('temporary', 'deleting');
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "public_media_assets_target_idx"
  ON "public_media_assets" USING btree ("target_type", "target_id")
  WHERE "status" = 'attached';
