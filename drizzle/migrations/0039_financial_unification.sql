-- Phase 6 : obligations financières, finalisation d'abonnement et remboursements.

ALTER TYPE "transaction_type" ADD VALUE IF NOT EXISTS 'remboursement';
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "financial_journal_entry_type" AS ENUM (
    'payment_confirmed', 'refund_obligation_created'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "financial_direction" AS ENUM ('inflow', 'outflow');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "financial_channel" AS ENUM ('provider', 'offline', 'internal');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'refund_obligation_created';
--> statement-breakpoint

ALTER TABLE "transactions"
  ADD COLUMN IF NOT EXISTS "original_payment_id" varchar(36),
  ADD COLUMN IF NOT EXISTS "refund_idempotency_key" varchar(128);
--> statement-breakpoint

ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "recorded_reference" varchar(255);
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "transactions"
    ADD CONSTRAINT "transactions_original_payment_id_payments_id_fk"
    FOREIGN KEY ("original_payment_id") REFERENCES "payments"("id")
    ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "transactions_original_payment_idx"
  ON "transactions" ("original_payment_id");
CREATE UNIQUE INDEX IF NOT EXISTS "transactions_refund_idempotency_unique"
  ON "transactions" ("original_payment_id", "refund_idempotency_key")
  WHERE "original_payment_id" IS NOT NULL;
--> statement-breakpoint

ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_source_coherent";
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_source_coherent" CHECK (
  ("type"::text = 'commande_restaurant' AND "restaurant_order_id" IS NOT NULL AND "subscription_request_id" IS NULL AND "commission_settlement_id" IS NULL AND "residence_reservation_id" IS NULL AND "original_payment_id" IS NULL AND "refund_idempotency_key" IS NULL)
  OR ("type"::text = 'abonnement_partenaire' AND "restaurant_order_id" IS NULL AND "subscription_request_id" IS NOT NULL AND "commission_settlement_id" IS NULL AND "residence_reservation_id" IS NULL AND "original_payment_id" IS NULL AND "refund_idempotency_key" IS NULL)
  OR ("type"::text = 'commission_settlement' AND "restaurant_order_id" IS NULL AND "subscription_request_id" IS NULL AND "commission_settlement_id" IS NOT NULL AND "residence_reservation_id" IS NULL AND "original_payment_id" IS NULL AND "refund_idempotency_key" IS NULL)
  OR ("type"::text = 'reservation_residence' AND "restaurant_order_id" IS NULL AND "subscription_request_id" IS NULL AND "commission_settlement_id" IS NULL AND "residence_reservation_id" IS NOT NULL AND "original_payment_id" IS NULL AND "refund_idempotency_key" IS NULL)
  OR ("type"::text = 'remboursement' AND "restaurant_order_id" IS NULL AND "subscription_request_id" IS NULL AND "commission_settlement_id" IS NULL AND "residence_reservation_id" IS NULL AND "original_payment_id" IS NOT NULL AND "refund_idempotency_key" IS NOT NULL)
);
--> statement-breakpoint

CREATE OR REPLACE FUNCTION enforce_transaction_financial_owner()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  expected_partner_account_id uuid;
  original_payment_amount integer;
  original_payment_status text;
  original_transaction_type text;
  already_refunded integer;
BEGIN
  CASE NEW.type::text
    WHEN 'commande_restaurant' THEN
      SELECT r.partner_account_id INTO expected_partner_account_id
      FROM commandes c
      JOIN restaurants r ON r.id = c.restaurant_id
      WHERE c.id = NEW.restaurant_order_id;
    WHEN 'abonnement_partenaire' THEN
      SELECT sr.partner_account_id INTO expected_partner_account_id
      FROM subscription_requests sr
      WHERE sr.id = NEW.subscription_request_id;
    WHEN 'commission_settlement' THEN
      SELECT cs.partner_account_id INTO expected_partner_account_id
      FROM commission_settlements cs
      WHERE cs.id = NEW.commission_settlement_id;
    WHEN 'reservation_residence' THEN
      SELECT rr.partner_account_id INTO expected_partner_account_id
      FROM residence_reservations rr
      WHERE rr.id = NEW.residence_reservation_id;
    WHEN 'remboursement' THEN
      PERFORM 1 FROM payments WHERE id = NEW.original_payment_id FOR UPDATE;
      SELECT
        t.partner_account_id,
        p.amount_fcfa,
        p.status::text,
        t.type::text
      INTO
        expected_partner_account_id,
        original_payment_amount,
        original_payment_status,
        original_transaction_type
      FROM payments p
      JOIN transactions t ON t.id = p.transaction_id
      WHERE p.id = NEW.original_payment_id;

      IF original_payment_status IS DISTINCT FROM 'confirmed'
        OR original_transaction_type = 'remboursement'
      THEN
        RAISE EXCEPTION 'refund_original_payment_not_confirmed'
          USING ERRCODE = '23514';
      END IF;

      SELECT COALESCE(SUM(t.amount_fcfa), 0)::integer
      INTO already_refunded
      FROM transactions t
      WHERE t.type::text = 'remboursement'
        AND t.original_payment_id = NEW.original_payment_id
        AND t.status::text <> 'cancelled'
        AND t.id <> NEW.id;

      IF already_refunded + NEW.amount_fcfa > original_payment_amount THEN
        RAISE EXCEPTION 'refund_amount_exceeds_original_payment'
          USING ERRCODE = '23514';
      END IF;
  END CASE;

  IF expected_partner_account_id IS NULL
    OR expected_partner_account_id <> NEW.partner_account_id
  THEN
    RAISE EXCEPTION 'transaction_partner_account_mismatch'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS transactions_financial_owner_guard ON transactions;
CREATE TRIGGER transactions_financial_owner_guard
BEFORE INSERT OR UPDATE OF
  type,
  partner_account_id,
  amount_fcfa,
  restaurant_order_id,
  subscription_request_id,
  commission_settlement_id,
  residence_reservation_id,
  original_payment_id
ON transactions
FOR EACH ROW EXECUTE FUNCTION enforce_transaction_financial_owner();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION enforce_paid_subscription_period_source()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  request_partner_account_id uuid;
  request_amount integer;
  paid_transaction_count integer;
BEGIN
  IF NEW.request_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT partner_account_id, prix_fige_fcfa
  INTO request_partner_account_id, request_amount
  FROM subscription_requests
  WHERE id = NEW.request_id;

  IF request_partner_account_id IS NULL
    OR request_partner_account_id <> NEW.partner_account_id
  THEN
    RAISE EXCEPTION 'subscription_period_partner_account_mismatch'
      USING ERRCODE = '23514';
  END IF;

  IF request_amount > 0 THEN
    SELECT COUNT(*)::integer
    INTO paid_transaction_count
    FROM transactions t
    JOIN payments p ON p.transaction_id = t.id
    WHERE t.subscription_request_id = NEW.request_id
      AND t.partner_account_id = NEW.partner_account_id
      AND t.status::text = 'paid'
      AND p.status::text = 'confirmed';

    IF paid_transaction_count <> 1 THEN
      RAISE EXCEPTION 'paid_subscription_period_requires_confirmed_payment'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS subscription_periods_paid_source_guard ON subscription_periods;
CREATE TRIGGER subscription_periods_paid_source_guard
BEFORE INSERT OR UPDATE OF request_id, partner_account_id, prix_paye_fcfa
ON subscription_periods
FOR EACH ROW EXECUTE FUNCTION enforce_paid_subscription_period_source();
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "financial_journal_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "transaction_id" varchar(36) NOT NULL,
  "payment_id" varchar(36),
  "partner_account_id" uuid NOT NULL,
  "subscription_period_id" varchar(36),
  "event_id" uuid NOT NULL,
  "entry_type" "financial_journal_entry_type" NOT NULL,
  "direction" "financial_direction" NOT NULL,
  "channel" "financial_channel" NOT NULL,
  "amount_fcfa" integer NOT NULL,
  "currency" varchar(3) DEFAULT 'XOF' NOT NULL,
  "provider" varchar(50),
  "method" "payment_method",
  "reference" varchar(255),
  "actor_type" "audit_actor_type" NOT NULL,
  "actor_id" varchar(128) NOT NULL,
  "occurred_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "financial_journal_entries_amount_positive" CHECK ("amount_fcfa" > 0),
  CONSTRAINT "financial_journal_entries_currency_xof" CHECK ("currency" = 'XOF'),
  CONSTRAINT "financial_journal_entries_shape_coherent" CHECK (
    ("entry_type" = 'payment_confirmed' AND "payment_id" IS NOT NULL AND "direction" = 'inflow' AND "method" IS NOT NULL)
    OR ("entry_type" = 'refund_obligation_created' AND "payment_id" IS NOT NULL AND "direction" = 'outflow' AND "channel" = 'internal' AND "subscription_period_id" IS NULL)
  ),
  CONSTRAINT "financial_journal_entries_transaction_id_transactions_id_fk"
    FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE restrict,
  CONSTRAINT "financial_journal_entries_payment_id_payments_id_fk"
    FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE restrict,
  CONSTRAINT "financial_journal_entries_partner_account_id_partner_accounts_id_fk"
    FOREIGN KEY ("partner_account_id") REFERENCES "partner_accounts"("id") ON DELETE restrict,
  CONSTRAINT "financial_journal_entries_subscription_period_id_subscription_periods_id_fk"
    FOREIGN KEY ("subscription_period_id") REFERENCES "subscription_periods"("id") ON DELETE restrict,
  CONSTRAINT "financial_journal_entries_event_id_business_events_id_fk"
    FOREIGN KEY ("event_id") REFERENCES "business_events"("id") ON DELETE restrict
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "financial_journal_entries_event_unique"
  ON "financial_journal_entries" ("event_id");
CREATE UNIQUE INDEX IF NOT EXISTS "financial_journal_entries_confirmed_payment_unique"
  ON "financial_journal_entries" ("payment_id")
  WHERE "entry_type" = 'payment_confirmed';
CREATE UNIQUE INDEX IF NOT EXISTS "financial_journal_entries_subscription_period_unique"
  ON "financial_journal_entries" ("subscription_period_id")
  WHERE "subscription_period_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "financial_journal_entries_partner_occurred_idx"
  ON "financial_journal_entries" ("partner_account_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "financial_journal_entries_transaction_idx"
  ON "financial_journal_entries" ("transaction_id");
--> statement-breakpoint

CREATE OR REPLACE FUNCTION reject_financial_journal_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('toutci.financial_journal_maintenance', true) = 'on' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'financial_journal_is_append_only'
    USING ERRCODE = '55000';
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS financial_journal_append_only ON financial_journal_entries;
CREATE TRIGGER financial_journal_append_only
BEFORE UPDATE OR DELETE ON financial_journal_entries
FOR EACH ROW EXECUTE FUNCTION reject_financial_journal_mutation();
