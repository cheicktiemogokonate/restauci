CREATE INDEX IF NOT EXISTS "residences_public_discovery_idx"
  ON "residences" ("first_published_at" DESC, "id")
  WHERE "publication_intent" = TRUE
    AND "publication_enabled_at" IS NOT NULL
    AND "first_published_at" IS NOT NULL
    AND "actif" = TRUE
    AND "suspendu" = FALSE
    AND "archived_at" IS NULL;
