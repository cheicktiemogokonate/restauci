-- 0031 : portail livreur V1, offres acceptables, preuve client et garde cash
--
-- Migration additive. Les anciens livreurs reçoivent un login opaque mais aucun
-- mot de passe : ils restent donc dans l'état « Accès à activer ».

ALTER TYPE "statut_livraison" ADD VALUE IF NOT EXISTS 'annulee';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_offer_status') THEN
    CREATE TYPE "delivery_offer_status" AS ENUM (
      'pending', 'accepted', 'declined', 'expired', 'cancelled'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_actor_type') THEN
    CREATE TYPE "delivery_actor_type" AS ENUM (
      'restaurant', 'driver', 'client', 'system'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_proof_method') THEN
    CREATE TYPE "delivery_proof_method" AS ENUM ('client_code', 'client_app');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'driver_cash_collection_status') THEN
    CREATE TYPE "driver_cash_collection_status" AS ENUM ('held', 'remitted');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_event_type') THEN
    CREATE TYPE "delivery_event_type" AS ENUM (
      'driver_created',
      'driver_updated',
      'driver_deactivated',
      'driver_credentials_issued',
      'driver_credentials_reset',
      'driver_credentials_activated',
      'driver_availability_changed',
      'offer_created',
      'offer_accepted',
      'offer_declined',
      'offer_expired',
      'offer_cancelled',
      'delivery_unassigned',
      'delivery_assigned',
      'delivery_reassigned',
      'delivery_started',
      'delivery_completed',
      'delivery_failed',
      'delivery_cancelled',
      'delivery_proof_issued',
      'delivery_proof_verified',
      'cash_collected',
      'cash_remitted'
    );
  END IF;
END
$$;

ALTER TYPE "type_notification" ADD VALUE IF NOT EXISTS 'delivery_offer_received';
ALTER TYPE "type_notification" ADD VALUE IF NOT EXISTS 'delivery_offer_declined';
ALTER TYPE "type_notification" ADD VALUE IF NOT EXISTS 'delivery_started';
ALTER TYPE "type_notification" ADD VALUE IF NOT EXISTS 'delivery_completed';
ALTER TYPE "type_notification" ADD VALUE IF NOT EXISTS 'delivery_failed';
ALTER TYPE "type_notification" ADD VALUE IF NOT EXISTS 'cash_remittance_confirmed';

ALTER TABLE "livreurs"
  ADD COLUMN IF NOT EXISTS "photo_url" text,
  ADD COLUMN IF NOT EXISTS "login_id" varchar(32),
  ADD COLUMN IF NOT EXISTS "password_hash" text,
  ADD COLUMN IF NOT EXISTS "must_change_password" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "credentials_version" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "credentials_issued_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "temporary_password_expires_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "password_changed_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "last_login_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "last_seen_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "deactivated_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "deactivated_by_user_id" varchar(36);

UPDATE "livreurs"
SET "login_id" = 'LIV-' || upper(substr(replace("id", '-', ''), 1, 24))
WHERE "login_id" IS NULL;

UPDATE "livreurs"
SET "deactivated_at" = COALESCE("updated_at", NOW())
WHERE NOT "actif" AND "deactivated_at" IS NULL;

ALTER TABLE "livreurs" ALTER COLUMN "login_id" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "livreurs_login_id_unique"
  ON "livreurs" ("login_id");
CREATE INDEX IF NOT EXISTS "livreurs_restaurant_availability_idx"
  ON "livreurs" ("restaurant_id", "actif", "en_ligne");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'livreurs_deactivated_by_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "livreurs"
      ADD CONSTRAINT "livreurs_deactivated_by_user_id_users_id_fk"
      FOREIGN KEY ("deactivated_by_user_id") REFERENCES "users"("id")
      ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'livreurs_credentials_version_valid'
  ) THEN
    ALTER TABLE "livreurs"
      ADD CONSTRAINT "livreurs_credentials_version_valid"
      CHECK ("credentials_version" >= 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'livreurs_deactivation_coherent'
  ) THEN
    ALTER TABLE "livreurs"
      ADD CONSTRAINT "livreurs_deactivation_coherent"
      CHECK (("actif" AND "deactivated_at" IS NULL)
        OR (NOT "actif" AND "deactivated_at" IS NOT NULL));
  END IF;
END
$$;

ALTER TABLE "livraisons"
  ADD COLUMN IF NOT EXISTS "failure_reason" varchar(50),
  ADD COLUMN IF NOT EXISTS "failure_note" text,
  ADD COLUMN IF NOT EXISTS "failed_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "cancelled_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "proof_code_digest" varchar(64),
  ADD COLUMN IF NOT EXISTS "proof_code_nonce" varchar(32),
  ADD COLUMN IF NOT EXISTS "proof_code_issued_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "proof_verified_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "proof_method" "delivery_proof_method",
  ADD COLUMN IF NOT EXISTS "proof_verified_by_client_id" varchar(36),
  ADD COLUMN IF NOT EXISTS "proof_attempts" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "cash_collected_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "cash_collected_amount_fcfa" integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'livraisons_proof_verified_by_client_id_clients_id_fk'
  ) THEN
    ALTER TABLE "livraisons"
      ADD CONSTRAINT "livraisons_proof_verified_by_client_id_clients_id_fk"
      FOREIGN KEY ("proof_verified_by_client_id") REFERENCES "clients"("id")
      ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'livraisons_proof_attempts_valid'
  ) THEN
    ALTER TABLE "livraisons"
      ADD CONSTRAINT "livraisons_proof_attempts_valid"
      CHECK ("proof_attempts" BETWEEN 0 AND 10);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'livraisons_cash_amount_valid'
  ) THEN
    ALTER TABLE "livraisons"
      ADD CONSTRAINT "livraisons_cash_amount_valid"
      CHECK ("cash_collected_amount_fcfa" IS NULL OR "cash_collected_amount_fcfa" > 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'livraisons_proof_coherent'
  ) THEN
    ALTER TABLE "livraisons"
      ADD CONSTRAINT "livraisons_proof_coherent"
      CHECK (
        ("proof_verified_at" IS NULL AND "proof_method" IS NULL AND "proof_verified_by_client_id" IS NULL)
        OR
        ("proof_verified_at" IS NOT NULL AND "proof_method" IS NOT NULL
          AND ("proof_method"::text <> 'client_app' OR "proof_verified_by_client_id" IS NOT NULL))
      ) NOT VALID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'livraisons_proof_issue_coherent'
  ) THEN
    ALTER TABLE "livraisons"
      ADD CONSTRAINT "livraisons_proof_issue_coherent"
      CHECK (num_nonnulls("proof_code_digest", "proof_code_nonce", "proof_code_issued_at") IN (0, 3));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'livraisons_cash_collection_coherent'
  ) THEN
    ALTER TABLE "livraisons"
      ADD CONSTRAINT "livraisons_cash_collection_coherent"
      CHECK (num_nonnulls("cash_collected_at", "cash_collected_amount_fcfa") IN (0, 2));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'livraisons_failure_coherent'
  ) THEN
    ALTER TABLE "livraisons"
      ADD CONSTRAINT "livraisons_failure_coherent"
      CHECK (("statut"::text = 'echouee' AND "failure_reason" IS NOT NULL AND "failed_at" IS NOT NULL)
        OR "statut"::text <> 'echouee') NOT VALID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'livraisons_cancellation_coherent'
  ) THEN
    ALTER TABLE "livraisons"
      ADD CONSTRAINT "livraisons_cancellation_coherent"
      CHECK (("statut"::text = 'annulee' AND "cancelled_at" IS NOT NULL)
        OR "statut"::text <> 'annulee') NOT VALID;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS "livraisons_active_driver_unique"
  ON "livraisons" ("livreur_id")
  WHERE "livreur_id" IS NOT NULL AND "statut" IN ('assignee', 'en_route');

CREATE TABLE IF NOT EXISTS "delivery_offers" (
  "id" varchar(36) PRIMARY KEY,
  "delivery_id" varchar(36) NOT NULL REFERENCES "livraisons"("id") ON DELETE RESTRICT,
  "order_id" varchar(36) NOT NULL REFERENCES "commandes"("id") ON DELETE RESTRICT,
  "restaurant_id" varchar(36) NOT NULL REFERENCES "restaurants"("id") ON DELETE RESTRICT,
  "driver_id" varchar(36) NOT NULL REFERENCES "livreurs"("id") ON DELETE RESTRICT,
  "status" "delivery_offer_status" NOT NULL DEFAULT 'pending',
  "decline_reason" varchar(50),
  "decline_note" text,
  "become_unavailable" boolean NOT NULL DEFAULT false,
  "created_by_user_id" varchar(36) NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "expires_at" timestamptz NOT NULL,
  "responded_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT NOW(),
  "updated_at" timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT "delivery_offers_expiry_valid" CHECK ("expires_at" > "created_at"),
  CONSTRAINT "delivery_offers_response_coherent" CHECK (
    ("status" = 'pending' AND "responded_at" IS NULL)
    OR ("status" <> 'pending' AND "responded_at" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS "delivery_offers_pending_delivery_unique"
  ON "delivery_offers" ("delivery_id") WHERE "status" = 'pending';
CREATE UNIQUE INDEX IF NOT EXISTS "delivery_offers_pending_driver_unique"
  ON "delivery_offers" ("driver_id") WHERE "status" = 'pending';
CREATE INDEX IF NOT EXISTS "delivery_offers_driver_status_idx"
  ON "delivery_offers" ("driver_id", "status", "expires_at");
CREATE INDEX IF NOT EXISTS "delivery_offers_restaurant_created_idx"
  ON "delivery_offers" ("restaurant_id", "created_at");

CREATE TABLE IF NOT EXISTS "delivery_events" (
  "id" varchar(36) PRIMARY KEY,
  "delivery_id" varchar(36) REFERENCES "livraisons"("id") ON DELETE RESTRICT,
  "order_id" varchar(36) REFERENCES "commandes"("id") ON DELETE RESTRICT,
  "restaurant_id" varchar(36) NOT NULL REFERENCES "restaurants"("id") ON DELETE RESTRICT,
  "driver_id" varchar(36) REFERENCES "livreurs"("id") ON DELETE RESTRICT,
  "offer_id" varchar(36) REFERENCES "delivery_offers"("id") ON DELETE RESTRICT,
  "event_type" "delivery_event_type" NOT NULL,
  "actor_type" "delivery_actor_type" NOT NULL,
  "actor_id" varchar(36) NOT NULL,
  "from_status" "statut_livraison",
  "to_status" "statut_livraison",
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "delivery_events_delivery_created_idx"
  ON "delivery_events" ("delivery_id", "created_at");
CREATE INDEX IF NOT EXISTS "delivery_events_restaurant_created_idx"
  ON "delivery_events" ("restaurant_id", "created_at");
CREATE INDEX IF NOT EXISTS "delivery_events_driver_created_idx"
  ON "delivery_events" ("driver_id", "created_at");

CREATE OR REPLACE FUNCTION prevent_delivery_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'delivery_events est append-only';
END;
$$;

DROP TRIGGER IF EXISTS "delivery_events_append_only" ON "delivery_events";
CREATE TRIGGER "delivery_events_append_only"
  BEFORE UPDATE OR DELETE ON "delivery_events"
  FOR EACH ROW EXECUTE FUNCTION prevent_delivery_event_mutation();

CREATE TABLE IF NOT EXISTS "driver_cash_remittances" (
  "id" varchar(36) PRIMARY KEY,
  "restaurant_id" varchar(36) NOT NULL REFERENCES "restaurants"("id") ON DELETE RESTRICT,
  "driver_id" varchar(36) NOT NULL REFERENCES "livreurs"("id") ON DELETE RESTRICT,
  "expected_amount_fcfa" integer NOT NULL,
  "received_amount_fcfa" integer NOT NULL,
  "confirmed_by_user_id" varchar(36) NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "note" text,
  "confirmed_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT "driver_cash_remittances_exact_amount"
    CHECK ("expected_amount_fcfa" > 0 AND "received_amount_fcfa" = "expected_amount_fcfa")
);

CREATE INDEX IF NOT EXISTS "driver_cash_remittances_driver_confirmed_idx"
  ON "driver_cash_remittances" ("driver_id", "confirmed_at");

CREATE TABLE IF NOT EXISTS "driver_cash_collections" (
  "id" varchar(36) PRIMARY KEY,
  "delivery_id" varchar(36) NOT NULL REFERENCES "livraisons"("id") ON DELETE RESTRICT,
  "order_id" varchar(36) NOT NULL REFERENCES "commandes"("id") ON DELETE RESTRICT,
  "restaurant_id" varchar(36) NOT NULL REFERENCES "restaurants"("id") ON DELETE RESTRICT,
  "driver_id" varchar(36) NOT NULL REFERENCES "livreurs"("id") ON DELETE RESTRICT,
  "expected_amount_fcfa" integer NOT NULL,
  "collected_amount_fcfa" integer NOT NULL,
  "status" "driver_cash_collection_status" NOT NULL DEFAULT 'held',
  "remittance_id" varchar(36) REFERENCES "driver_cash_remittances"("id") ON DELETE RESTRICT,
  "collected_at" timestamptz NOT NULL,
  "remitted_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT "driver_cash_collections_amount_exact"
    CHECK ("expected_amount_fcfa" > 0 AND "collected_amount_fcfa" = "expected_amount_fcfa"),
  CONSTRAINT "driver_cash_collections_lifecycle_coherent" CHECK (
    ("status" = 'held' AND "remittance_id" IS NULL AND "remitted_at" IS NULL)
    OR ("status" = 'remitted' AND "remittance_id" IS NOT NULL AND "remitted_at" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS "driver_cash_collections_delivery_unique"
  ON "driver_cash_collections" ("delivery_id");
CREATE UNIQUE INDEX IF NOT EXISTS "driver_cash_collections_order_unique"
  ON "driver_cash_collections" ("order_id");
CREATE INDEX IF NOT EXISTS "driver_cash_collections_driver_status_idx"
  ON "driver_cash_collections" ("driver_id", "status", "collected_at");

ALTER TABLE "notifications"
  ADD COLUMN IF NOT EXISTS "driver_id" varchar(36);

ALTER TABLE "push_subscriptions"
  ADD COLUMN IF NOT EXISTS "driver_id" varchar(36);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notifications_driver_id_livreurs_id_fk'
  ) THEN
    ALTER TABLE "notifications"
      ADD CONSTRAINT "notifications_driver_id_livreurs_id_fk"
      FOREIGN KEY ("driver_id") REFERENCES "livreurs"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'push_subscriptions_driver_id_livreurs_id_fk'
  ) THEN
    ALTER TABLE "push_subscriptions"
      ADD CONSTRAINT "push_subscriptions_driver_id_livreurs_id_fk"
      FOREIGN KEY ("driver_id") REFERENCES "livreurs"("id") ON DELETE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "idx_notifications_driver"
  ON "notifications" ("driver_id");
CREATE INDEX IF NOT EXISTS "idx_push_subscriptions_driver"
  ON "push_subscriptions" ("driver_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notifications_single_owner'
  ) THEN
    ALTER TABLE "notifications"
      ADD CONSTRAINT "notifications_single_owner"
      CHECK (num_nonnulls("user_id", "client_id", "driver_id") = 1) NOT VALID;
  END IF;
END
$$;

ALTER TABLE "push_subscriptions"
  DROP CONSTRAINT IF EXISTS "push_subscriptions_single_owner";
ALTER TABLE "push_subscriptions"
  ADD CONSTRAINT "push_subscriptions_single_owner"
  CHECK (num_nonnulls("user_id", "client_id", "driver_id") = 1) NOT VALID;
