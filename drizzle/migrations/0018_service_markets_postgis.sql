CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE "service_market_status" AS ENUM ('draft', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "service_market_capability_status" AS ENUM ('disabled', 'prelaunch', 'active', 'paused');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "service_activity_type" AS ENUM ('restaurant', 'residence', 'event');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "geo_assignment_status" AS ENUM ('assigned', 'outside_published_market', 'ambiguous', 'pending_review');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "geo_source" AS ENUM ('osm');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "geo_source_object_type" AS ENUM ('relation');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "service_market_area_operation" AS ENUM ('include', 'exclude');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'service_market_version_published';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'service_market_capability_changed';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'geo_source_areas_imported';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'service_market_created';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'service_market_version_created';

CREATE TABLE IF NOT EXISTS "geo_source_areas" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "source" "geo_source" DEFAULT 'osm' NOT NULL,
  "source_type" "geo_source_object_type" DEFAULT 'relation' NOT NULL,
  "source_ref" varchar(255) NOT NULL,
  "source_version" varchar(100) NOT NULL,
  "name" varchar(255) NOT NULL,
  "name_local" varchar(255),
  "country_code" varchar(2) NOT NULL,
  "admin_level" varchar(20),
  "tags" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "geometry" geometry(MultiPolygon, 4326) NOT NULL,
  "geometry_checksum" varchar(64) NOT NULL,
  "source_updated_at" timestamptz,
  "imported_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "geo_source_areas_geometry_not_empty" CHECK (NOT ST_IsEmpty("geometry")),
  CONSTRAINT "geo_source_areas_geometry_valid" CHECK (ST_IsValid("geometry"))
);

CREATE UNIQUE INDEX IF NOT EXISTS "geo_source_areas_source_version_unique"
  ON "geo_source_areas" ("source", "source_ref", "source_version");
CREATE INDEX IF NOT EXISTS "geo_source_areas_country_idx"
  ON "geo_source_areas" ("country_code");
CREATE INDEX IF NOT EXISTS "geo_source_areas_geometry_gist"
  ON "geo_source_areas" USING gist ("geometry");

CREATE TABLE IF NOT EXISTS "service_markets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" varchar(80) NOT NULL UNIQUE,
  "name" varchar(255) NOT NULL,
  "country_code" varchar(2) NOT NULL,
  "status" "service_market_status" DEFAULT 'draft' NOT NULL,
  "active_version_id" uuid,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "published_at" timestamptz,
  "archived_at" timestamptz,
  CONSTRAINT "service_markets_lifecycle_coherent" CHECK (
    ("status" = 'draft' AND "published_at" IS NULL AND "archived_at" IS NULL)
    OR ("status" = 'published' AND "published_at" IS NOT NULL AND "archived_at" IS NULL AND "active_version_id" IS NOT NULL)
    OR ("status" = 'archived' AND "archived_at" IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS "service_markets_country_status_idx"
  ON "service_markets" ("country_code", "status");

CREATE TABLE IF NOT EXISTS "service_market_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "service_market_id" uuid NOT NULL,
  "version" integer NOT NULL,
  "geometry" geometry(MultiPolygon, 4326) NOT NULL,
  "geometry_checksum" varchar(64) NOT NULL,
  "source_manifest" jsonb NOT NULL,
  "created_by_user_id" varchar(36) NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "published_at" timestamptz,
  "retired_at" timestamptz,
  CONSTRAINT "service_market_versions_market_fk" FOREIGN KEY ("service_market_id") REFERENCES "service_markets"("id") ON DELETE restrict,
  CONSTRAINT "service_market_versions_created_by_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE restrict,
  CONSTRAINT "service_market_versions_geometry_not_empty" CHECK (NOT ST_IsEmpty("geometry")),
  CONSTRAINT "service_market_versions_geometry_valid" CHECK (ST_IsValid("geometry")),
  CONSTRAINT "service_market_versions_version_positive" CHECK ("version" > 0),
  CONSTRAINT "service_market_versions_lifecycle_coherent" CHECK ("retired_at" IS NULL OR "published_at" IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS "service_market_versions_market_version_unique"
  ON "service_market_versions" ("service_market_id", "version");
CREATE INDEX IF NOT EXISTS "service_market_versions_market_lifecycle_idx"
  ON "service_market_versions" ("service_market_id", "published_at", "retired_at");
CREATE INDEX IF NOT EXISTS "service_market_versions_geometry_gist"
  ON "service_market_versions" USING gist ("geometry");

DO $$ BEGIN
  ALTER TABLE "service_markets"
    ADD CONSTRAINT "service_markets_active_version_fk"
    FOREIGN KEY ("active_version_id") REFERENCES "service_market_versions"("id") ON DELETE restrict;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "service_market_capabilities" (
  "service_market_id" uuid NOT NULL,
  "activity_type" "service_activity_type" NOT NULL,
  "status" "service_market_capability_status" DEFAULT 'disabled' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "prelaunch_at" timestamptz,
  "activated_at" timestamptz,
  "paused_at" timestamptz,
  CONSTRAINT "service_market_capabilities_pk" PRIMARY KEY ("service_market_id", "activity_type"),
  CONSTRAINT "service_market_capabilities_market_fk" FOREIGN KEY ("service_market_id") REFERENCES "service_markets"("id") ON DELETE restrict,
  CONSTRAINT "service_market_capabilities_lifecycle_coherent" CHECK (
    ("status" = 'disabled')
    OR ("status" = 'prelaunch' AND "prelaunch_at" IS NOT NULL)
    OR ("status" = 'active' AND "activated_at" IS NOT NULL)
    OR ("status" = 'paused' AND "paused_at" IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS "service_market_capabilities_activity_status_idx"
  ON "service_market_capabilities" ("activity_type", "status");

CREATE TABLE IF NOT EXISTS "service_market_version_areas" (
  "service_market_version_id" uuid NOT NULL,
  "geo_source_area_id" uuid NOT NULL,
  "operation" "service_market_area_operation" DEFAULT 'include' NOT NULL,
  CONSTRAINT "service_market_version_areas_pk" PRIMARY KEY ("service_market_version_id", "geo_source_area_id"),
  CONSTRAINT "service_market_version_areas_version_fk" FOREIGN KEY ("service_market_version_id") REFERENCES "service_market_versions"("id") ON DELETE cascade,
  CONSTRAINT "service_market_version_areas_source_area_fk" FOREIGN KEY ("geo_source_area_id") REFERENCES "geo_source_areas"("id") ON DELETE restrict
);

ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "service_market_id" uuid;
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "service_market_version_id" uuid;
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "geo_assignment_status" "geo_assignment_status" DEFAULT 'pending_review' NOT NULL;
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "geo_assigned_at" timestamptz;

DO $$ BEGIN
  ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_service_market_fk"
    FOREIGN KEY ("service_market_id") REFERENCES "service_markets"("id") ON DELETE restrict;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_service_market_version_fk"
    FOREIGN KEY ("service_market_version_id") REFERENCES "service_market_versions"("id") ON DELETE restrict;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_geo_assignment_coherent" CHECK (
    ("geo_assignment_status" = 'assigned' AND "service_market_id" IS NOT NULL AND "service_market_version_id" IS NOT NULL AND "geo_assigned_at" IS NOT NULL)
    OR ("geo_assignment_status" <> 'assigned' AND "service_market_id" IS NULL AND "service_market_version_id" IS NULL)
  ) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "restaurants_market_visibility_idx"
  ON "restaurants" ("service_market_id", "actif", "suspendu")
  WHERE "actif" = true AND "suspendu" = false;

ALTER TABLE "commandes" ADD COLUMN IF NOT EXISTS "service_market_id" uuid;
ALTER TABLE "commandes" ADD COLUMN IF NOT EXISTS "service_market_version_id" uuid;
ALTER TABLE "commandes" ADD COLUMN IF NOT EXISTS "client_location_captured_at" timestamptz;
ALTER TABLE "commandes" ADD COLUMN IF NOT EXISTS "client_location_accuracy_m" real;
ALTER TABLE "commandes" ADD COLUMN IF NOT EXISTS "geo_policy_version" varchar(50);

DO $$ BEGIN
  ALTER TABLE "commandes" ADD CONSTRAINT "commandes_service_market_fk"
    FOREIGN KEY ("service_market_id") REFERENCES "service_markets"("id") ON DELETE restrict;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "commandes" ADD CONSTRAINT "commandes_service_market_version_fk"
    FOREIGN KEY ("service_market_version_id") REFERENCES "service_market_versions"("id") ON DELETE restrict;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "commandes" ADD CONSTRAINT "commandes_livraison_location_coherent" CHECK (
    "mode_commande" <> 'livraison'
    OR ("adresse_livraison" IS NOT NULL AND "latitude_livraison" IS NOT NULL AND "longitude_livraison" IS NOT NULL)
  ) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "commandes" ADD CONSTRAINT "commandes_geo_snapshot_coherent" CHECK (
    ("service_market_id" IS NULL AND "service_market_version_id" IS NULL)
    OR ("service_market_id" IS NOT NULL AND "service_market_version_id" IS NOT NULL AND "geo_policy_version" IS NOT NULL)
  ) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "commandes_service_market_idx"
  ON "commandes" ("service_market_id", "created_at");

CREATE OR REPLACE FUNCTION prevent_published_service_market_overlap()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'published' AND NEW.active_version_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM service_markets other_market
      JOIN service_market_versions other_version
        ON other_version.id = other_market.active_version_id
      JOIN service_market_versions new_version
        ON new_version.id = NEW.active_version_id
      WHERE other_market.id <> NEW.id
        AND other_market.status = 'published'
        AND ST_Intersects(other_version.geometry, new_version.geometry)
        AND NOT ST_Touches(other_version.geometry, new_version.geometry)
    ) THEN
      RAISE EXCEPTION 'SERVICE_MARKET_OVERLAP';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS service_markets_prevent_overlap ON service_markets;
CREATE TRIGGER service_markets_prevent_overlap
  BEFORE INSERT OR UPDATE OF status, active_version_id ON service_markets
  FOR EACH ROW EXECUTE FUNCTION prevent_published_service_market_overlap();
