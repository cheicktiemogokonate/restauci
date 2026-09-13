-- Complément Phase 3 : conserver une preuve minimale des effets après purge de l'outbox.

CREATE TABLE IF NOT EXISTS "event_effect_receipts" (
  "id" uuid PRIMARY KEY NOT NULL,
  "event_id" uuid NOT NULL,
  "effect_type" varchar(80) NOT NULL,
  "completed_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "event_effect_receipts_event_id_business_events_id_fk"
    FOREIGN KEY ("event_id") REFERENCES "public"."business_events"("id")
    ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "event_effect_receipts_event_effect_unique"
  ON "event_effect_receipts" ("event_id", "effect_type");
CREATE INDEX IF NOT EXISTS "event_effect_receipts_completed_at_idx"
  ON "event_effect_receipts" ("completed_at");
ALTER TABLE "audit_log" ALTER COLUMN "ressource_id" TYPE varchar(128);
