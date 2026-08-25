CREATE TABLE IF NOT EXISTS "subscription_plan_exposure_benefits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "plan_id" varchar(36) NOT NULL,
  "activity_type" "activity_type" NOT NULL,
  "exposure_weight" integer NOT NULL,
  "search_promoted_eligible" boolean DEFAULT false NOT NULL,
  "market_featured_eligible" boolean DEFAULT false NOT NULL,
  "homepage_featured_eligible" boolean DEFAULT false NOT NULL,
  "partner_badge_enabled" boolean DEFAULT false NOT NULL,
  "recommended" boolean DEFAULT false NOT NULL,
  "cta_label" varchar(80) NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "subscription_plan_exposure_benefits_weight_valid"
    CHECK ("exposure_weight" BETWEEN 1 AND 100)
);

CREATE TABLE IF NOT EXISTS "subscription_plan_feature_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "plan_id" varchar(36) NOT NULL,
  "activity_type" "activity_type" NOT NULL,
  "label" varchar(160) NOT NULL,
  "sort_order" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "subscription_plan_feature_items_order_valid"
    CHECK ("sort_order" >= 0)
);

CREATE TABLE IF NOT EXISTS "discovery_policy_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "activity_type" "activity_type" NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "sponsored_share_bps" integer DEFAULT 2500 NOT NULL,
  "rotation_window_minutes" integer DEFAULT 1440 NOT NULL,
  "max_promoted_per_partner" integer DEFAULT 1 NOT NULL,
  "updated_by_admin_id" varchar(36),
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "discovery_policy_settings_sponsored_share_valid"
    CHECK ("sponsored_share_bps" BETWEEN 0 AND 5000),
  CONSTRAINT "discovery_policy_settings_rotation_window_valid"
    CHECK ("rotation_window_minutes" BETWEEN 15 AND 10080),
  CONSTRAINT "discovery_policy_settings_partner_limit_valid"
    CHECK ("max_promoted_per_partner" BETWEEN 1 AND 10),
  CONSTRAINT "discovery_policy_settings_activity_type_unique"
    UNIQUE ("activity_type")
);

CREATE TABLE IF NOT EXISTS "subscription_catalogue_draft" (
  "id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
  "payload" jsonb NOT NULL,
  "updated_by_admin_id" varchar(36) NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "subscription_catalogue_draft_singleton" CHECK ("id" = 1)
);

CREATE TABLE IF NOT EXISTS "subscription_catalogue_revisions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "version" integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  "payload" jsonb NOT NULL,
  "published_by_admin_id" varchar(36) NOT NULL,
  "published_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "subscription_catalogue_revisions_version_unique" UNIQUE ("version")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subscription_plan_exposure_benefits_plan_id_subscription_plans_id_fk'
  ) THEN
    ALTER TABLE "subscription_plan_exposure_benefits"
      ADD CONSTRAINT "subscription_plan_exposure_benefits_plan_id_subscription_plans_id_fk"
      FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id")
      ON DELETE cascade ON UPDATE no action;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subscription_plan_feature_items_plan_id_subscription_plans_id_fk'
  ) THEN
    ALTER TABLE "subscription_plan_feature_items"
      ADD CONSTRAINT "subscription_plan_feature_items_plan_id_subscription_plans_id_fk"
      FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id")
      ON DELETE cascade ON UPDATE no action;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'discovery_policy_settings_updated_by_admin_id_users_id_fk'
  ) THEN
    ALTER TABLE "discovery_policy_settings"
      ADD CONSTRAINT "discovery_policy_settings_updated_by_admin_id_users_id_fk"
      FOREIGN KEY ("updated_by_admin_id") REFERENCES "public"."users"("id")
      ON DELETE set null ON UPDATE no action;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subscription_catalogue_draft_updated_by_admin_id_users_id_fk'
  ) THEN
    ALTER TABLE "subscription_catalogue_draft"
      ADD CONSTRAINT "subscription_catalogue_draft_updated_by_admin_id_users_id_fk"
      FOREIGN KEY ("updated_by_admin_id") REFERENCES "public"."users"("id")
      ON DELETE restrict ON UPDATE no action;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subscription_catalogue_revisions_published_by_admin_id_users_id_fk'
  ) THEN
    ALTER TABLE "subscription_catalogue_revisions"
      ADD CONSTRAINT "subscription_catalogue_revisions_published_by_admin_id_users_id_fk"
      FOREIGN KEY ("published_by_admin_id") REFERENCES "public"."users"("id")
      ON DELETE restrict ON UPDATE no action;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "subscription_plan_exposure_benefits_plan_activity_unique"
  ON "subscription_plan_exposure_benefits" ("plan_id", "activity_type");
CREATE INDEX IF NOT EXISTS "subscription_plan_exposure_benefits_plan_idx"
  ON "subscription_plan_exposure_benefits" ("plan_id");
CREATE INDEX IF NOT EXISTS "subscription_plan_exposure_benefits_activity_weight_idx"
  ON "subscription_plan_exposure_benefits" ("activity_type", "exposure_weight");
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_plan_feature_items_plan_activity_order_unique"
  ON "subscription_plan_feature_items" ("plan_id", "activity_type", "sort_order");
CREATE INDEX IF NOT EXISTS "subscription_plan_feature_items_plan_activity_idx"
  ON "subscription_plan_feature_items" ("plan_id", "activity_type");
CREATE INDEX IF NOT EXISTS "discovery_policy_settings_updated_by_idx"
  ON "discovery_policy_settings" ("updated_by_admin_id");
CREATE INDEX IF NOT EXISTS "subscription_catalogue_draft_updated_by_idx"
  ON "subscription_catalogue_draft" ("updated_by_admin_id");
CREATE INDEX IF NOT EXISTS "subscription_catalogue_revisions_published_by_idx"
  ON "subscription_catalogue_revisions" ("published_by_admin_id");
CREATE INDEX IF NOT EXISTS "subscription_catalogue_revisions_published_at_idx"
  ON "subscription_catalogue_revisions" ("published_at");

INSERT INTO "discovery_policy_settings" (
  "activity_type",
  "enabled",
  "sponsored_share_bps",
  "rotation_window_minutes",
  "max_promoted_per_partner"
)
VALUES
  ('restaurant', true, 2500, 1440, 1),
  ('residence', true, 2500, 1440, 1)
ON CONFLICT ("activity_type") DO NOTHING;

INSERT INTO "subscription_plan_exposure_benefits" (
  "plan_id",
  "activity_type",
  "exposure_weight",
  "search_promoted_eligible",
  "market_featured_eligible",
  "homepage_featured_eligible",
  "partner_badge_enabled",
  "recommended",
  "cta_label"
)
SELECT
  plan."id",
  activity."activity_type"::"activity_type",
  CASE plan."code"
    WHEN 'decouverte' THEN 1
    WHEN 'croissance' THEN 3
    WHEN 'partenaire_fier' THEN 6
  END,
  plan."code" IN ('croissance', 'partenaire_fier'),
  plan."code" = 'partenaire_fier',
  plan."code" = 'partenaire_fier',
  plan."code" = 'partenaire_fier',
  plan."code" = 'partenaire_fier',
  CASE plan."code"
    WHEN 'decouverte' THEN 'Commencer gratuitement'
    ELSE 'Choisir cette offre'
  END
FROM "subscription_plans" plan
CROSS JOIN (
  VALUES ('restaurant'), ('residence')
) AS activity("activity_type")
WHERE plan."code" IN ('decouverte', 'croissance', 'partenaire_fier')
ON CONFLICT ("plan_id", "activity_type") DO NOTHING;

INSERT INTO "subscription_plan_feature_items" (
  "plan_id",
  "activity_type",
  "label",
  "sort_order"
)
SELECT plan."id", seed."activity_type"::"activity_type", seed."label", seed."sort_order"
FROM "subscription_plans" plan
JOIN (
  VALUES
    ('decouverte', 'restaurant', 'Fiche Restaurant visible après validation', 0),
    ('decouverte', 'restaurant', 'Jusqu’à 20 plats et 5 catégories', 1),
    ('decouverte', 'restaurant', 'Gestion des commandes en temps réel', 2),
    ('croissance', 'restaurant', 'Tous les avantages de Découverte', 0),
    ('croissance', 'restaurant', 'Jusqu’à 50 plats et 10 catégories', 1),
    ('croissance', 'restaurant', 'Participation aux emplacements Mis en avant', 2),
    ('partenaire_fier', 'restaurant', 'Catégories et plats illimités', 0),
    ('partenaire_fier', 'restaurant', 'Priorité d’exposition la plus élevée', 1),
    ('partenaire_fier', 'restaurant', 'Mise en avant sur l’accueil et dans la zone', 2),
    ('partenaire_fier', 'restaurant', 'Badge Partenaire Fier', 3),
    ('decouverte', 'residence', '1 résidence publiée simultanément', 0),
    ('decouverte', 'residence', 'Réservations et paiements Paystack', 1),
    ('croissance', 'residence', 'Jusqu’à 5 résidences publiées simultanément', 0),
    ('croissance', 'residence', 'Participation aux emplacements Mis en avant', 1),
    ('partenaire_fier', 'residence', 'Résidences publiées illimitées', 0),
    ('partenaire_fier', 'residence', 'Priorité d’exposition la plus élevée', 1),
    ('partenaire_fier', 'residence', 'Mise en avant sur l’accueil et par destination', 2),
    ('partenaire_fier', 'residence', 'Badge Partenaire Fier', 3)
) AS seed("plan_code", "activity_type", "label", "sort_order")
  ON seed."plan_code" = plan."code"::text
ON CONFLICT ("plan_id", "activity_type", "sort_order") DO NOTHING;

DO $$
BEGIN
  IF (SELECT count(*) FROM "discovery_policy_settings") < 2 THEN
    RAISE EXCEPTION 'Configuration discovery incomplète';
  END IF;
  IF (
    SELECT count(*)
    FROM "subscription_plan_exposure_benefits"
    WHERE "plan_id" IN (
      SELECT "id" FROM "subscription_plans"
      WHERE "code" IN ('decouverte', 'croissance', 'partenaire_fier')
    )
  ) < 6 THEN
    RAISE EXCEPTION 'Avantages exposition abonnement incomplets';
  END IF;
END $$;
