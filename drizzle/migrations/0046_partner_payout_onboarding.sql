-- Phase 14 — provisionnement autonome des destinations de versement Paystack.

ALTER TYPE "payment_provider_account_status" ADD VALUE IF NOT EXISTS 'pending';
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "payout_destination_type" AS ENUM ('bank_account', 'mobile_money');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "payment_provider_environment" AS ENUM ('test', 'live');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

ALTER TABLE "payment_provider_accounts"
  ADD COLUMN IF NOT EXISTS "destination_type" "payout_destination_type" NOT NULL DEFAULT 'bank_account',
  ADD COLUMN IF NOT EXISTS "provider_environment" "payment_provider_environment" NOT NULL DEFAULT 'live',
  ADD COLUMN IF NOT EXISTS "provider_verified" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "settlement_institution_code" varchar(50),
  ADD COLUMN IF NOT EXISTS "settlement_institution_name" varchar(160),
  ADD COLUMN IF NOT EXISTS "account_identifier_last4" varchar(4),
  ADD COLUMN IF NOT EXISTS "linked_by_user_id" varchar(36);
--> statement-breakpoint

UPDATE "payment_provider_accounts"
SET "provider_verified" = true
WHERE "verified_at" IS NOT NULL;
--> statement-breakpoint

ALTER TABLE "payment_provider_accounts"
  ALTER COLUMN "verified_at" DROP NOT NULL,
  ALTER COLUMN "linked_by_admin_id" DROP NOT NULL;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "payment_provider_accounts"
    ADD CONSTRAINT "payment_provider_accounts_linked_by_user_id_users_id_fk"
    FOREIGN KEY ("linked_by_user_id") REFERENCES "users"("id")
    ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

ALTER TABLE "payment_provider_accounts"
  DROP CONSTRAINT IF EXISTS "payment_provider_accounts_lifecycle_coherent";
ALTER TABLE "payment_provider_accounts"
  ADD CONSTRAINT "payment_provider_accounts_lifecycle_coherent" CHECK (
    ("status"::text IN ('pending', 'active') AND "disabled_at" IS NULL)
    OR ("status"::text = 'disabled' AND "disabled_at" IS NOT NULL)
  );
--> statement-breakpoint

ALTER TABLE "payment_provider_accounts"
  ADD CONSTRAINT "payment_provider_accounts_actor_coherent" CHECK (
    (("linked_by_admin_id" IS NOT NULL)::integer + ("linked_by_user_id" IS NOT NULL)::integer) = 1
  ),
  ADD CONSTRAINT "payment_provider_accounts_verification_coherent" CHECK (
    "provider_verified" = ("verified_at" IS NOT NULL)
  ),
  ADD CONSTRAINT "payment_provider_accounts_active_eligibility" CHECK (
    "status"::text <> 'active'
    OR "provider_environment"::text = 'test'
    OR "provider_verified"
  ),
  ADD CONSTRAINT "payment_provider_accounts_last4_valid" CHECK (
    "account_identifier_last4" IS NULL
    OR "account_identifier_last4" ~ '^[A-Za-z0-9]{4}$'
  );
