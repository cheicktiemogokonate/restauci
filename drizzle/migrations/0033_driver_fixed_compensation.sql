-- 0033 : rémunération fixe facultative des livreurs, figée par mission

ALTER TYPE "delivery_event_type"
  ADD VALUE IF NOT EXISTS 'driver_compensation_paid';

ALTER TABLE "livreurs"
  ADD COLUMN IF NOT EXISTS "fixed_delivery_compensation_fcfa" integer;

ALTER TABLE "delivery_offers"
  ADD COLUMN IF NOT EXISTS "driver_compensation_amount_fcfa" integer;

ALTER TABLE "livraisons"
  ADD COLUMN IF NOT EXISTS "driver_compensation_amount_fcfa" integer,
  ADD COLUMN IF NOT EXISTS "driver_compensation_paid_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "driver_compensation_paid_by_user_id" varchar(36),
  ADD COLUMN IF NOT EXISTS "driver_compensation_payment_note" text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'livreurs_fixed_delivery_compensation_valid'
  ) THEN
    ALTER TABLE "livreurs"
      ADD CONSTRAINT "livreurs_fixed_delivery_compensation_valid"
      CHECK (
        "fixed_delivery_compensation_fcfa" IS NULL
        OR (
          "fixed_delivery_compensation_fcfa" > 0
          AND "fixed_delivery_compensation_fcfa" <= 1000000
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'delivery_offers_driver_compensation_amount_valid'
  ) THEN
    ALTER TABLE "delivery_offers"
      ADD CONSTRAINT "delivery_offers_driver_compensation_amount_valid"
      CHECK (
        "driver_compensation_amount_fcfa" IS NULL
        OR (
          "driver_compensation_amount_fcfa" > 0
          AND "driver_compensation_amount_fcfa" <= 1000000
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'livraisons_driver_compensation_amount_valid'
  ) THEN
    ALTER TABLE "livraisons"
      ADD CONSTRAINT "livraisons_driver_compensation_amount_valid"
      CHECK (
        "driver_compensation_amount_fcfa" IS NULL
        OR (
          "driver_compensation_amount_fcfa" > 0
          AND "driver_compensation_amount_fcfa" <= 1000000
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'livraisons_driver_compensation_payment_coherent'
  ) THEN
    ALTER TABLE "livraisons"
      ADD CONSTRAINT "livraisons_driver_compensation_payment_coherent"
      CHECK (
        (
          "driver_compensation_paid_at" IS NULL
          AND "driver_compensation_paid_by_user_id" IS NULL
          AND "driver_compensation_payment_note" IS NULL
        )
        OR (
          "statut" = 'livree'
          AND "driver_compensation_amount_fcfa" IS NOT NULL
          AND "driver_compensation_paid_at" IS NOT NULL
          AND "driver_compensation_paid_by_user_id" IS NOT NULL
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'livraisons_driver_compensation_paid_by_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "livraisons"
      ADD CONSTRAINT "livraisons_driver_compensation_paid_by_user_id_users_id_fk"
      FOREIGN KEY ("driver_compensation_paid_by_user_id")
      REFERENCES "users"("id") ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "livraisons_pending_driver_compensation_idx"
  ON "livraisons" ("livreur_id", "heure_livree")
  WHERE "statut" = 'livree'
    AND "driver_compensation_amount_fcfa" IS NOT NULL
    AND "driver_compensation_paid_at" IS NULL;
