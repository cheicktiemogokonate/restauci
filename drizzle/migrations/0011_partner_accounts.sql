CREATE TYPE "public"."activity_type" AS ENUM('restaurant', 'residence');--> statement-breakpoint
ALTER TYPE "public"."role" RENAME VALUE 'restaurateur' TO 'partner';--> statement-breakpoint
CREATE TABLE "partner_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"activity_type" "activity_type" NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);--> statement-breakpoint
ALTER TABLE "partner_accounts" ADD CONSTRAINT "partner_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "partner_accounts_user_id_unique" ON "partner_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "partner_accounts_activity_type_idx" ON "partner_accounts" USING btree ("activity_type");--> statement-breakpoint
INSERT INTO "partner_accounts" ("id", "user_id", "activity_type", "created_at", "updated_at")
SELECT gen_random_uuid(), "id", 'restaurant'::"activity_type", NOW(), NOW()
FROM "users"
WHERE "role" = 'partner';--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "partner_account_id" uuid;--> statement-breakpoint
ALTER TABLE "subscription_periods" ADD COLUMN "partner_account_id" uuid;--> statement-breakpoint
ALTER TABLE "subscription_requests" ADD COLUMN "partner_account_id" uuid;--> statement-breakpoint
UPDATE "restaurants" AS r
SET "partner_account_id" = pa."id"
FROM "partner_accounts" AS pa
WHERE pa."user_id" = r."user_id";--> statement-breakpoint
UPDATE "subscription_periods" AS sp
SET "partner_account_id" = r."partner_account_id"
FROM "restaurants" AS r
WHERE r."id" = sp."restaurant_id";--> statement-breakpoint
UPDATE "subscription_requests" AS sr
SET "partner_account_id" = r."partner_account_id"
FROM "restaurants" AS r
WHERE r."id" = sr."restaurant_id";--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM "restaurants" WHERE "partner_account_id" IS NULL) THEN
		RAISE EXCEPTION 'Migration partner_accounts: restaurant sans compte partenaire';
	END IF;
	IF EXISTS (SELECT 1 FROM "subscription_periods" WHERE "partner_account_id" IS NULL) THEN
		RAISE EXCEPTION 'Migration partner_accounts: période sans compte partenaire';
	END IF;
	IF EXISTS (SELECT 1 FROM "subscription_requests" WHERE "partner_account_id" IS NULL) THEN
		RAISE EXCEPTION 'Migration partner_accounts: demande sans compte partenaire';
	END IF;
END $$;--> statement-breakpoint
ALTER TABLE "restaurants" ALTER COLUMN "partner_account_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_periods" ALTER COLUMN "partner_account_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_requests" ALTER COLUMN "partner_account_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "restaurants" DROP CONSTRAINT "restaurants_user_id_unique";--> statement-breakpoint
ALTER TABLE "restaurants" DROP CONSTRAINT "restaurants_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "subscription_periods" DROP CONSTRAINT "subscription_periods_restaurant_id_restaurants_id_fk";--> statement-breakpoint
ALTER TABLE "subscription_requests" DROP CONSTRAINT "subscription_requests_restaurant_id_restaurants_id_fk";--> statement-breakpoint
DROP INDEX "idx_restaurants_user_id";--> statement-breakpoint
DROP INDEX "idx_sub_periods_restaurant";--> statement-breakpoint
DROP INDEX "idx_sub_periods_restaurant_statut";--> statement-breakpoint
DROP INDEX "subscription_periods_one_active_paid_per_restaurant";--> statement-breakpoint
DROP INDEX "idx_sub_requests_restaurant";--> statement-breakpoint
DROP INDEX "idx_sub_requests_restaurant_statut";--> statement-breakpoint
DROP INDEX "subscription_requests_one_pending_per_restaurant";--> statement-breakpoint
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_partner_account_id_partner_accounts_id_fk" FOREIGN KEY ("partner_account_id") REFERENCES "public"."partner_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_periods" ADD CONSTRAINT "subscription_periods_partner_account_id_partner_accounts_id_fk" FOREIGN KEY ("partner_account_id") REFERENCES "public"."partner_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_requests" ADD CONSTRAINT "subscription_requests_partner_account_id_partner_accounts_id_fk" FOREIGN KEY ("partner_account_id") REFERENCES "public"."partner_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_partner_account_id_unique" UNIQUE("partner_account_id");--> statement-breakpoint
CREATE INDEX "subscription_periods_partner_account_idx" ON "subscription_periods" USING btree ("partner_account_id");--> statement-breakpoint
CREATE INDEX "subscription_periods_partner_account_statut_idx" ON "subscription_periods" USING btree ("partner_account_id", "statut");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_periods_one_active_paid_per_partner_account" ON "subscription_periods" USING btree ("partner_account_id") WHERE "subscription_periods"."statut" = 'active' AND "subscription_periods"."plan_code" <> 'decouverte';--> statement-breakpoint
CREATE INDEX "subscription_requests_partner_account_idx" ON "subscription_requests" USING btree ("partner_account_id");--> statement-breakpoint
CREATE INDEX "subscription_requests_partner_account_statut_idx" ON "subscription_requests" USING btree ("partner_account_id", "statut");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_requests_one_pending_per_partner_account" ON "subscription_requests" USING btree ("partner_account_id") WHERE "subscription_requests"."statut" = 'en_attente';--> statement-breakpoint
ALTER TABLE "restaurants" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "restaurants" DROP COLUMN "taux_commission_bps";--> statement-breakpoint
ALTER TABLE "subscription_periods" DROP COLUMN "restaurant_id";--> statement-breakpoint
ALTER TABLE "subscription_requests" DROP COLUMN "restaurant_id";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'partner';--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "pending_plan_code";--> statement-breakpoint
ALTER TABLE "abonnements" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "abonnements" CASCADE;--> statement-breakpoint
DROP TYPE "public"."plan_abonnement";--> statement-breakpoint
DROP TYPE "public"."statut_abonnement";
