DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'residence_reservation_status') THEN
    CREATE TYPE "residence_reservation_status" AS ENUM (
      'en_attente_paiement',
      'confirmee',
      'annulee'
    );
  END IF;
END $$;

ALTER TYPE "transaction_type" ADD VALUE IF NOT EXISTS 'reservation_residence';--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "residence_reservations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "residence_id" uuid NOT NULL,
  "partner_account_id" uuid NOT NULL,
  "client_id" varchar(36) NOT NULL,
  "status" "residence_reservation_status" DEFAULT 'en_attente_paiement' NOT NULL,
  "check_in" date NOT NULL,
  "check_out" date NOT NULL,
  "nights" integer NOT NULL,
  "guests" integer NOT NULL,
  "price_per_night_snapshot_fcfa" integer NOT NULL,
  "subtotal_fcfa" integer NOT NULL,
  "total_fcfa" integer NOT NULL,
  "confirmed_at" timestamp with time zone,
  "cancelled_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "residence_reservations_stay_valid" CHECK (
    "check_in" < "check_out" AND "nights" > 0 AND "guests" > 0
  ),
  CONSTRAINT "residence_reservations_amounts_valid" CHECK (
    "price_per_night_snapshot_fcfa" > 0
    AND "subtotal_fcfa" > 0
    AND "total_fcfa" = "subtotal_fcfa"
    AND "subtotal_fcfa" = "price_per_night_snapshot_fcfa" * "nights"
  ),
  CONSTRAINT "residence_reservations_lifecycle_valid" CHECK (
    ("status" = 'en_attente_paiement' AND "confirmed_at" IS NULL AND "cancelled_at" IS NULL)
    OR ("status" = 'confirmee' AND "confirmed_at" IS NOT NULL AND "cancelled_at" IS NULL)
    OR ("status" = 'annulee' AND "cancelled_at" IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS "residence_unavailable_periods" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "residence_id" uuid NOT NULL,
  "check_in" date NOT NULL,
  "check_out" date NOT NULL,
  "reason" varchar(255),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "residence_unavailable_periods_stay_valid" CHECK ("check_in" < "check_out")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'residence_reservations_residence_id_residences_id_fk') THEN
    ALTER TABLE "residence_reservations" ADD CONSTRAINT "residence_reservations_residence_id_residences_id_fk"
      FOREIGN KEY ("residence_id") REFERENCES "public"."residences"("id") ON DELETE restrict ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'residence_reservations_partner_account_id_partner_accounts_id_fk') THEN
    ALTER TABLE "residence_reservations" ADD CONSTRAINT "residence_reservations_partner_account_id_partner_accounts_id_fk"
      FOREIGN KEY ("partner_account_id") REFERENCES "public"."partner_accounts"("id") ON DELETE restrict ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'residence_reservations_client_id_clients_id_fk') THEN
    ALTER TABLE "residence_reservations" ADD CONSTRAINT "residence_reservations_client_id_clients_id_fk"
      FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'residence_unavailable_periods_residence_id_residences_id_fk') THEN
    ALTER TABLE "residence_unavailable_periods" ADD CONSTRAINT "residence_unavailable_periods_residence_id_residences_id_fk"
      FOREIGN KEY ("residence_id") REFERENCES "public"."residences"("id") ON DELETE restrict ON UPDATE no action;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "residence_reservations_residence_dates_idx"
  ON "residence_reservations" ("residence_id", "check_in", "check_out")
  WHERE "status" <> 'annulee';
CREATE INDEX IF NOT EXISTS "residence_reservations_client_created_idx"
  ON "residence_reservations" ("client_id", "created_at");
CREATE INDEX IF NOT EXISTS "residence_reservations_partner_created_idx"
  ON "residence_reservations" ("partner_account_id", "created_at");
CREATE INDEX IF NOT EXISTS "residence_reservations_status_created_idx"
  ON "residence_reservations" ("status", "created_at");
CREATE INDEX IF NOT EXISTS "residence_unavailable_periods_residence_dates_idx"
  ON "residence_unavailable_periods" ("residence_id", "check_in", "check_out");

ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "residence_reservation_id" uuid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_residence_reservation_id_residence_reservations_id_fk') THEN
    ALTER TABLE "transactions" ADD CONSTRAINT "transactions_residence_reservation_id_residence_reservations_id_fk"
      FOREIGN KEY ("residence_reservation_id") REFERENCES "public"."residence_reservations"("id") ON DELETE restrict ON UPDATE no action;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "transactions_residence_reservation_unique"
  ON "transactions" ("residence_reservation_id") WHERE "residence_reservation_id" IS NOT NULL;
ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_source_coherent";
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_source_coherent" CHECK (
  ("type"::text = 'commande_restaurant' AND "restaurant_order_id" IS NOT NULL AND "subscription_request_id" IS NULL AND "commission_settlement_id" IS NULL AND "residence_reservation_id" IS NULL)
  OR ("type"::text = 'abonnement_partenaire' AND "restaurant_order_id" IS NULL AND "subscription_request_id" IS NOT NULL AND "commission_settlement_id" IS NULL AND "residence_reservation_id" IS NULL)
  OR ("type"::text = 'commission_settlement' AND "restaurant_order_id" IS NULL AND "subscription_request_id" IS NULL AND "commission_settlement_id" IS NOT NULL AND "residence_reservation_id" IS NULL)
  OR ("type"::text = 'reservation_residence' AND "restaurant_order_id" IS NULL AND "subscription_request_id" IS NULL AND "commission_settlement_id" IS NULL AND "residence_reservation_id" IS NOT NULL)
);

ALTER TABLE "commissions" ALTER COLUMN "commande_id" DROP NOT NULL;
ALTER TABLE "commissions" ADD COLUMN IF NOT EXISTS "residence_reservation_id" uuid;
ALTER TABLE "commissions" DROP CONSTRAINT IF EXISTS "commissions_commande_id_unique";
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'commissions_residence_reservation_id_residence_reservations_id_fk') THEN
    ALTER TABLE "commissions" ADD CONSTRAINT "commissions_residence_reservation_id_residence_reservations_id_fk"
      FOREIGN KEY ("residence_reservation_id") REFERENCES "public"."residence_reservations"("id") ON DELETE restrict ON UPDATE no action;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "commissions_commande_id_unique"
  ON "commissions" ("commande_id") WHERE "commande_id" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "commissions_residence_reservation_unique"
  ON "commissions" ("residence_reservation_id") WHERE "residence_reservation_id" IS NOT NULL;
ALTER TABLE "commissions" DROP CONSTRAINT IF EXISTS "commissions_source_valid";
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_source_valid" CHECK (
  ("commande_id" IS NOT NULL AND "residence_reservation_id" IS NULL)
  OR ("commande_id" IS NULL AND "residence_reservation_id" IS NOT NULL)
);
