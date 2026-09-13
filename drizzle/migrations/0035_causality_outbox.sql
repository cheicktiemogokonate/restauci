-- Phase 3 : enveloppe causale, audit multi-acteurs et outbox transactionnelle.

DO $$ BEGIN
  CREATE TYPE "audit_actor_type" AS ENUM (
    'admin', 'partner', 'client', 'driver', 'system', 'provider'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "outbox_status" AS ENUM (
    'pending', 'processing', 'retry', 'completed', 'dead_letter'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "business_events" (
  "id" uuid PRIMARY KEY NOT NULL,
  "correlation_id" uuid NOT NULL,
  "type" varchar(120) NOT NULL,
  "actor_type" "audit_actor_type" NOT NULL,
  "actor_id" varchar(128) NOT NULL,
  "partner_account_id" uuid,
  "target_type" varchar(80) NOT NULL,
  "target_id" varchar(128) NOT NULL,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "occurred_at" timestamp with time zone NOT NULL,
  "retained_until" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "business_events_payload_size"
    CHECK (octet_length("payload"::text) <= 16384),
  CONSTRAINT "business_events_partner_account_id_partner_accounts_id_fk"
    FOREIGN KEY ("partner_account_id") REFERENCES "public"."partner_accounts"("id")
    ON DELETE restrict ON UPDATE no action
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "business_events_correlation_idx"
  ON "business_events" ("correlation_id");
CREATE INDEX IF NOT EXISTS "business_events_partner_account_idx"
  ON "business_events" ("partner_account_id");
CREATE INDEX IF NOT EXISTS "business_events_target_idx"
  ON "business_events" ("target_type", "target_id");
CREATE INDEX IF NOT EXISTS "business_events_occurred_at_idx"
  ON "business_events" ("occurred_at");
CREATE INDEX IF NOT EXISTS "business_events_retained_until_idx"
  ON "business_events" ("retained_until");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "outbox_messages" (
  "id" uuid PRIMARY KEY NOT NULL,
  "event_id" uuid NOT NULL,
  "effect_type" varchar(80) NOT NULL,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "status" "outbox_status" DEFAULT 'pending' NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "max_attempts" integer DEFAULT 5 NOT NULL,
  "available_at" timestamp with time zone DEFAULT now() NOT NULL,
  "locked_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "dead_lettered_at" timestamp with time zone,
  "resolved_at" timestamp with time zone,
  "last_error_code" varchar(100),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "outbox_messages_event_id_business_events_id_fk"
    FOREIGN KEY ("event_id") REFERENCES "public"."business_events"("id")
    ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "outbox_messages_attempts_valid"
    CHECK ("attempts" >= 0 AND "max_attempts" > 0),
  CONSTRAINT "outbox_messages_payload_size"
    CHECK (octet_length("payload"::text) <= 16384),
  CONSTRAINT "outbox_messages_lifecycle_coherent" CHECK (
    ("status" = 'processing' AND "locked_at" IS NOT NULL AND "completed_at" IS NULL)
    OR ("status" IN ('pending', 'retry') AND "locked_at" IS NULL AND "completed_at" IS NULL)
    OR ("status" = 'completed' AND "locked_at" IS NULL AND "completed_at" IS NOT NULL)
    OR ("status" = 'dead_letter' AND "locked_at" IS NULL AND "dead_lettered_at" IS NOT NULL AND "completed_at" IS NULL)
  )
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "outbox_messages_event_effect_unique"
  ON "outbox_messages" ("event_id", "effect_type");
CREATE INDEX IF NOT EXISTS "outbox_messages_claim_idx"
  ON "outbox_messages" ("status", "available_at", "created_at");
CREATE INDEX IF NOT EXISTS "outbox_messages_unresolved_idx"
  ON "outbox_messages" ("created_at") WHERE "status" = 'dead_letter';
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "event_effect_receipts" (
  "id" uuid PRIMARY KEY NOT NULL,
  "event_id" uuid NOT NULL,
  "effect_type" varchar(80) NOT NULL,
  "completed_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "event_effect_receipts_event_id_business_events_id_fk"
    FOREIGN KEY ("event_id") REFERENCES "public"."business_events"("id")
    ON DELETE cascade ON UPDATE no action
);
CREATE UNIQUE INDEX IF NOT EXISTS "event_effect_receipts_event_effect_unique"
  ON "event_effect_receipts" ("event_id", "effect_type");
CREATE INDEX IF NOT EXISTS "event_effect_receipts_completed_at_idx"
  ON "event_effect_receipts" ("completed_at");
--> statement-breakpoint

ALTER TABLE "audit_log"
  ADD COLUMN IF NOT EXISTS "actor_type" "audit_actor_type" DEFAULT 'admin' NOT NULL,
  ADD COLUMN IF NOT EXISTS "actor_id" varchar(128),
  ADD COLUMN IF NOT EXISTS "event_id" uuid,
  ADD COLUMN IF NOT EXISTS "correlation_id" uuid,
  ADD COLUMN IF NOT EXISTS "partner_account_id" uuid;
--> statement-breakpoint

UPDATE "audit_log"
SET "actor_id" = "admin_id"
WHERE "actor_id" IS NULL;
ALTER TABLE "audit_log" ALTER COLUMN "actor_id" SET NOT NULL;
ALTER TABLE "audit_log" ALTER COLUMN "admin_id" DROP NOT NULL;
ALTER TABLE "audit_log" ALTER COLUMN "ressource_id" TYPE varchar(128);
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_event_id_business_events_id_fk"
    FOREIGN KEY ("event_id") REFERENCES "public"."business_events"("id")
    ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_partner_account_id_partner_accounts_id_fk"
    FOREIGN KEY ("partner_account_id") REFERENCES "public"."partner_accounts"("id")
    ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_coherent" CHECK (
    ("actor_type" = 'admin' AND "admin_id" IS NOT NULL AND "actor_id" = "admin_id")
    OR ("actor_type" <> 'admin' AND "admin_id" IS NULL)
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_event_correlation_coherent" CHECK (
    ("event_id" IS NULL) = ("correlation_id" IS NULL)
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "audit_log_actor_idx"
  ON "audit_log" ("actor_type", "actor_id");
CREATE UNIQUE INDEX IF NOT EXISTS "audit_log_event_unique"
  ON "audit_log" ("event_id") WHERE "event_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "audit_log_correlation_idx"
  ON "audit_log" ("correlation_id");
CREATE INDEX IF NOT EXISTS "audit_log_partner_account_idx"
  ON "audit_log" ("partner_account_id");
--> statement-breakpoint

CREATE OR REPLACE FUNCTION "audit_log_fill_legacy_actor"()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."actor_type" = 'admin' AND NEW."actor_id" IS NULL THEN
    NEW."actor_id" := NEW."admin_id";
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS "audit_log_fill_legacy_actor" ON "audit_log";
CREATE TRIGGER "audit_log_fill_legacy_actor"
  BEFORE INSERT ON "audit_log"
  FOR EACH ROW EXECUTE FUNCTION "audit_log_fill_legacy_actor"();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION "reject_causal_record_update"()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END;
$$;
DROP TRIGGER IF EXISTS "business_events_append_only" ON "business_events";
CREATE TRIGGER "business_events_append_only"
  BEFORE UPDATE ON "business_events"
  FOR EACH ROW EXECUTE FUNCTION "reject_causal_record_update"();
DROP TRIGGER IF EXISTS "audit_log_append_only" ON "audit_log";
CREATE TRIGGER "audit_log_append_only"
  BEFORE UPDATE ON "audit_log"
  FOR EACH ROW EXECUTE FUNCTION "reject_causal_record_update"();
