ALTER TABLE "push_subscriptions"
  ALTER COLUMN "user_id" DROP NOT NULL;

ALTER TABLE "push_subscriptions"
  ADD COLUMN IF NOT EXISTS "client_id" varchar(36);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'push_subscriptions_client_id_clients_id_fk'
  ) THEN
    ALTER TABLE "push_subscriptions"
      ADD CONSTRAINT "push_subscriptions_client_id_clients_id_fk"
      FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id")
      ON DELETE cascade ON UPDATE no action;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'push_subscriptions_single_owner'
  ) THEN
    ALTER TABLE "push_subscriptions"
      ADD CONSTRAINT "push_subscriptions_single_owner"
      CHECK (num_nonnulls("user_id", "client_id") = 1);
  END IF;
END $$;

-- Un token Expo représente une installation. Conserver sa ligne la plus récente
-- avant d'imposer l'unicité permet la reconnexion avec un autre compte client.
DELETE FROM "push_subscriptions" older
USING "push_subscriptions" newer
WHERE older."expo_token" IS NOT NULL
  AND older."expo_token" = newer."expo_token"
  AND (
    older."created_at" < newer."created_at"
    OR (older."created_at" = newer."created_at" AND older."id" < newer."id")
  );

CREATE INDEX IF NOT EXISTS "idx_push_subscriptions_client"
  ON "push_subscriptions" ("client_id");

CREATE UNIQUE INDEX IF NOT EXISTS "push_subscriptions_expo_token_unique"
  ON "push_subscriptions" ("expo_token")
  WHERE "expo_token" IS NOT NULL;
