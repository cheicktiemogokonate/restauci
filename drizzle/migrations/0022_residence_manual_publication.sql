ALTER TABLE "residences"
  ADD COLUMN IF NOT EXISTS "publication_enabled_at" timestamp with time zone;

CREATE INDEX IF NOT EXISTS "residences_publication_enabled_idx"
  ON "residences" ("partner_account_id", "publication_enabled_at");
