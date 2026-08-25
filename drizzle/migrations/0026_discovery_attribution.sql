DO $$ BEGIN
  CREATE TYPE "discovery_event_type" AS ENUM (
    'impression',
    'click',
    'detail_open',
    'conversion'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "discovery_placement" AS ENUM ('promoted', 'organic');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "discovery_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "attribution_id" uuid NOT NULL,
  "event_type" "discovery_event_type" NOT NULL,
  "activity_type" "activity_type" NOT NULL,
  "resource_id" varchar(36) NOT NULL,
  "partner_account_id" uuid NOT NULL,
  "plan_code" "plan_code" NOT NULL,
  "placement" "discovery_placement" NOT NULL,
  "context_hash" varchar(64) NOT NULL,
  "conversion_reference_id" varchar(36),
  "occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "discovery_events_partner_account_id_partner_accounts_id_fk"
    FOREIGN KEY ("partner_account_id") REFERENCES "partner_accounts"("id")
    ON DELETE CASCADE,
  CONSTRAINT "discovery_events_conversion_reference_valid"
    CHECK (
      ("event_type" = 'conversion' AND "conversion_reference_id" IS NOT NULL)
      OR
      ("event_type" <> 'conversion' AND "conversion_reference_id" IS NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS "discovery_events_attribution_event_unique"
  ON "discovery_events" ("attribution_id", "event_type");

CREATE INDEX IF NOT EXISTS "discovery_events_reporting_idx"
  ON "discovery_events" ("occurred_at", "activity_type", "plan_code", "placement");

CREATE INDEX IF NOT EXISTS "discovery_events_partner_idx"
  ON "discovery_events" ("partner_account_id", "occurred_at");

CREATE UNIQUE INDEX IF NOT EXISTS "discovery_events_conversion_reference_unique"
  ON "discovery_events" ("activity_type", "conversion_reference_id")
  WHERE "event_type" = 'conversion';
