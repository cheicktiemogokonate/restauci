CREATE TYPE "public"."quota_resource_type" AS ENUM('category', 'dish', 'residence');--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'quota_catalogue_modifie';--> statement-breakpoint

CREATE TABLE "subscription_plan_limits" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"plan_id" varchar(36) NOT NULL,
	"activity_type" "activity_type" NOT NULL,
	"resource_type" "quota_resource_type" NOT NULL,
	"max_count" integer,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now(),
	CONSTRAINT "subscription_plan_limits_max_count_valid" CHECK ("max_count" IS NULL OR "max_count" >= 0),
	CONSTRAINT "subscription_plan_limits_activity_resource_valid" CHECK (("activity_type" = 'restaurant' AND "resource_type" IN ('category', 'dish')) OR ("activity_type" = 'residence' AND "resource_type" = 'residence'))
);--> statement-breakpoint
CREATE TABLE "subscription_period_limits" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"subscription_period_id" varchar(36) NOT NULL,
	"activity_type" "activity_type" NOT NULL,
	"resource_type" "quota_resource_type" NOT NULL,
	"max_count" integer,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	CONSTRAINT "subscription_period_limits_max_count_valid" CHECK ("max_count" IS NULL OR "max_count" >= 0),
	CONSTRAINT "subscription_period_limits_activity_resource_valid" CHECK (("activity_type" = 'restaurant' AND "resource_type" IN ('category', 'dish')) OR ("activity_type" = 'residence' AND "resource_type" = 'residence'))
);--> statement-breakpoint
ALTER TABLE "subscription_plan_limits" ADD CONSTRAINT "subscription_plan_limits_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_period_limits" ADD CONSTRAINT "subscription_period_limits_subscription_period_id_subscription_periods_id_fk" FOREIGN KEY ("subscription_period_id") REFERENCES "public"."subscription_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_plan_limits_plan_activity_resource_unique" ON "subscription_plan_limits" USING btree ("plan_id", "activity_type", "resource_type");--> statement-breakpoint
CREATE INDEX "subscription_plan_limits_plan_idx" ON "subscription_plan_limits" USING btree ("plan_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_period_limits_period_activity_resource_unique" ON "subscription_period_limits" USING btree ("subscription_period_id", "activity_type", "resource_type");--> statement-breakpoint
CREATE INDEX "subscription_period_limits_period_idx" ON "subscription_period_limits" USING btree ("subscription_period_id");--> statement-breakpoint

INSERT INTO "subscription_plan_limits" ("id", "plan_id", "activity_type", "resource_type", "max_count")
SELECT gen_random_uuid()::text, "id", 'restaurant', 'category',
	CASE "code" WHEN 'decouverte' THEN 5 WHEN 'croissance' THEN 10 WHEN 'partenaire_fier' THEN NULL END
FROM "subscription_plans"
WHERE "code" IN ('decouverte', 'croissance', 'partenaire_fier');--> statement-breakpoint
INSERT INTO "subscription_plan_limits" ("id", "plan_id", "activity_type", "resource_type", "max_count")
SELECT gen_random_uuid()::text, "id", 'restaurant', 'dish',
	CASE "code" WHEN 'decouverte' THEN 20 WHEN 'croissance' THEN 50 WHEN 'partenaire_fier' THEN NULL END
FROM "subscription_plans"
WHERE "code" IN ('decouverte', 'croissance', 'partenaire_fier');--> statement-breakpoint

DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM "subscription_plans" p
		WHERE p."code" IN ('decouverte', 'croissance', 'partenaire_fier')
		AND (SELECT count(*) FROM "subscription_plan_limits" l WHERE l."plan_id" = p."id" AND l."activity_type" = 'restaurant') <> 2
	) THEN
		RAISE EXCEPTION 'Migration quotas: catalogue Restaurant incomplet';
	END IF;
END $$;--> statement-breakpoint

INSERT INTO "subscription_period_limits" ("id", "subscription_period_id", "activity_type", "resource_type", "max_count")
SELECT gen_random_uuid()::text, sp."id", l."activity_type", l."resource_type", l."max_count"
FROM "subscription_periods" sp
JOIN "subscription_plans" p ON p."code" = sp."plan_code"
JOIN "subscription_plan_limits" l ON l."plan_id" = p."id"
JOIN "partner_accounts" pa ON pa."id" = sp."partner_account_id" AND pa."activity_type" = l."activity_type"
WHERE sp."plan_code" <> 'decouverte';--> statement-breakpoint

ALTER TABLE "categories" RENAME COLUMN "visible" TO "publication_intent";--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "first_published_at" timestamp with time zone;--> statement-breakpoint
UPDATE "categories" SET "first_published_at" = "created_at" WHERE "publication_intent";--> statement-breakpoint
ALTER TABLE "plats" ADD COLUMN "publication_intent" boolean NOT NULL DEFAULT true;--> statement-breakpoint
ALTER TABLE "plats" ADD COLUMN "first_published_at" timestamp with time zone;--> statement-breakpoint
UPDATE "plats" SET "first_published_at" = "created_at";--> statement-breakpoint

DROP INDEX IF EXISTS "idx_categories_restaurant_visible";--> statement-breakpoint
CREATE INDEX "idx_categories_restaurant_publication" ON "categories" USING btree ("restaurant_id", "publication_intent");--> statement-breakpoint
CREATE INDEX "idx_categories_quota_order" ON "categories" USING btree ("restaurant_id", "first_published_at", "created_at", "id");--> statement-breakpoint
CREATE INDEX "idx_plats_quota_order" ON "plats" USING btree ("restaurant_id", "categorie_id", "first_published_at", "created_at", "id");--> statement-breakpoint

ALTER TABLE "subscription_plans" DROP COLUMN "max_plats";--> statement-breakpoint
ALTER TABLE "subscription_plans" DROP COLUMN "max_categories";
