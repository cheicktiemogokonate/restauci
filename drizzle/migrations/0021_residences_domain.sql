ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'residence_validee';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'residence_rejetee';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'residence_suspendue';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'residence_reactivee';

CREATE TABLE IF NOT EXISTS "residences" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "partner_account_id" uuid NOT NULL REFERENCES "partner_accounts"("id") ON DELETE RESTRICT,
  "title" varchar(160) NOT NULL,
  "slug" varchar(200) NOT NULL,
  "description" text NOT NULL,
  "price_per_night_fcfa" integer NOT NULL,
  "max_guests" integer NOT NULL,
  "address" text NOT NULL,
  "city" varchar(100) NOT NULL,
  "country" varchar(100) DEFAULT 'Côte d’Ivoire' NOT NULL,
  "latitude" double precision,
  "longitude" double precision,
  "publication_intent" boolean DEFAULT false NOT NULL,
  "first_published_at" timestamp with time zone,
  "actif" boolean DEFAULT false NOT NULL,
  "motif_rejet" text,
  "validated_by_admin_id" varchar(36) REFERENCES "users"("id") ON DELETE SET NULL,
  "validated_at" timestamp with time zone,
  "suspendu" boolean DEFAULT false NOT NULL,
  "motif_suspension" text,
  "archived_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "residences_price_per_night_positive" CHECK ("price_per_night_fcfa" > 0),
  CONSTRAINT "residences_max_guests_positive" CHECK ("max_guests" > 0),
  CONSTRAINT "residences_coordinates_coherent" CHECK (
    ("latitude" IS NULL AND "longitude" IS NULL)
    OR ("latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180)
  ),
  CONSTRAINT "residences_moderation_coherent" CHECK (
    ("actif" = false OR ("validated_at" IS NOT NULL AND "validated_by_admin_id" IS NOT NULL AND "motif_rejet" IS NULL))
    AND ("suspendu" = false OR length(trim("motif_suspension")) >= 10)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS "residences_slug_unique"
  ON "residences" ("slug");
CREATE INDEX IF NOT EXISTS "residences_partner_account_idx"
  ON "residences" ("partner_account_id", "created_at");
CREATE INDEX IF NOT EXISTS "residences_moderation_idx"
  ON "residences" ("publication_intent", "actif", "suspendu", "created_at");

CREATE TABLE IF NOT EXISTS "residence_images" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "residence_id" uuid NOT NULL REFERENCES "residences"("id") ON DELETE CASCADE,
  "url" text NOT NULL,
  "alt_text" varchar(255),
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "residence_images_sort_order_non_negative" CHECK ("sort_order" >= 0)
);

CREATE INDEX IF NOT EXISTS "residence_images_residence_idx"
  ON "residence_images" ("residence_id", "sort_order");
CREATE UNIQUE INDEX IF NOT EXISTS "residence_images_residence_url_unique"
  ON "residence_images" ("residence_id", "url");
