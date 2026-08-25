CREATE TYPE "public"."raison_fin_periode_abonnement" AS ENUM('expiration_naturelle', 'upgrade', 'annulation');--> statement-breakpoint
ALTER TYPE "public"."statut_periode_abonnement" ADD VALUE 'terminee' BEFORE 'suspendue';--> statement-breakpoint
ALTER TABLE "subscription_periods" ADD COLUMN "ended_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subscription_periods" ADD COLUMN "end_reason" "raison_fin_periode_abonnement";--> statement-breakpoint
-- Découverte est désormais un fallback calculé. Les anciennes lignes sont
-- conservées comme historique clôturé, mais ne peuvent plus être effectives.
UPDATE "subscription_periods"
SET
  "statut" = 'annulee',
  "ended_at" = COALESCE("date_echeance", "created_at"),
  "end_reason" = 'annulation'
WHERE "plan_code" = 'decouverte';--> statement-breakpoint
-- Les anciennes périodes payantes sans échéance retrouvent la durée annuelle
-- attendue avant l'ajout de la contrainte de cohérence.
UPDATE "subscription_periods"
SET "date_echeance" = "date_debut" + INTERVAL '1 year'
WHERE "date_echeance" IS NULL AND "plan_code" <> 'decouverte';--> statement-breakpoint
-- Matérialiser proprement les fins historiques existantes.
UPDATE "subscription_periods"
SET
  "statut" = 'expiree',
  "ended_at" = "date_echeance",
  "end_reason" = 'expiration_naturelle'
WHERE "statut" IN ('active', 'suspendue')
  AND "date_echeance" <= NOW();--> statement-breakpoint
UPDATE "subscription_periods"
SET
  "ended_at" = COALESCE("date_echeance", "created_at"),
  "end_reason" = 'expiration_naturelle'
WHERE "statut" = 'expiree' AND "ended_at" IS NULL;--> statement-breakpoint
UPDATE "subscription_periods"
SET
  "ended_at" = COALESCE("suspendu_at", "created_at"),
  "end_reason" = 'annulation'
WHERE "statut" = 'annulee' AND "ended_at" IS NULL;--> statement-breakpoint
-- En cas d'anomalies historiques, conserver la période active la plus récente
-- et clôturer les autres avant de poser l'index unique.
WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "restaurant_id"
    ORDER BY "date_debut" DESC, "created_at" DESC, "id" DESC
  ) AS rn
  FROM "subscription_periods"
  WHERE "statut" = 'active'
)
UPDATE "subscription_periods" AS periods
SET
  "statut" = 'annulee',
  "ended_at" = NOW(),
  "end_reason" = 'annulation'
FROM ranked
WHERE periods."id" = ranked."id" AND ranked.rn > 1;--> statement-breakpoint
-- Une demande Découverte n'a plus de sens commercial.
UPDATE "subscription_requests"
SET "statut" = 'annulee', "traitee_at" = COALESCE("traitee_at", NOW())
WHERE "statut" = 'en_attente' AND "plan_code" = 'decouverte';--> statement-breakpoint
WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "restaurant_id"
    ORDER BY "created_at" DESC, "id" DESC
  ) AS rn
  FROM "subscription_requests"
  WHERE "statut" = 'en_attente'
)
UPDATE "subscription_requests" AS requests
SET "statut" = 'annulee', "traitee_at" = NOW()
FROM ranked
WHERE requests."id" = ranked."id" AND ranked.rn > 1;--> statement-breakpoint
-- Descriptions commerciales génériques : aucune ville ni établissement ciblé.
UPDATE "subscription_plans" SET "description" = CASE "code"
  WHEN 'decouverte' THEN 'Pour démarrer sans frais avec Toutci.'
  WHEN 'croissance' THEN 'Pour accompagner le développement de votre activité.'
  WHEN 'partenaire_fier' THEN 'Pour les partenaires qui souhaitent l’offre la plus avancée.'
END;--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_periods_one_active_paid_per_restaurant" ON "subscription_periods" USING btree ("restaurant_id") WHERE "subscription_periods"."statut" = 'active' AND "subscription_periods"."plan_code" <> 'decouverte';--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_requests_one_pending_per_restaurant" ON "subscription_requests" USING btree ("restaurant_id") WHERE "subscription_requests"."statut" = 'en_attente';
