ALTER TABLE "users" ADD COLUMN "pending_plan_code" "plan_code";
--> statement-breakpoint
-- CUSTOM DATA MIGRATION: Populer subscription_plans
INSERT INTO "subscription_plans" ("id", "code", "nom", "description", "prix_annuel_fcfa", "taux_commission_bps", "max_plats", "max_categories", "ordre", "actif", "updated_at")
VALUES
  (gen_random_uuid(), 'decouverte', 'Découverte', 'Pour démarrer sans frais', 0, 1500, 20, 5, 1, true, now()),
  (gen_random_uuid(), 'croissance', 'Croissance', 'Pour les restaurants en développement', 25000, 1200, null, null, 2, true, now()),
  (gen_random_uuid(), 'partenaire_fier', 'Partenaire Fier', 'Pour être vu en premier et bénéficier du meilleur taux', 50000, 1000, null, null, 3, true, now());
--> statement-breakpoint
-- CUSTOM DATA MIGRATION: Migrer les abonnements existants vers subscription_periods
INSERT INTO "subscription_periods" (
  "id", "restaurant_id", "plan_code", "taux_commission_bps_fige", "prix_paye_fcfa", "moyen_reglement",
  "date_debut", "date_echeance", "statut", "created_at"
)
SELECT 
  gen_random_uuid(),
  a."restaurant_id",
  CASE 
    WHEN a."plan" = 'gratuit' THEN 'decouverte'::plan_code
    WHEN a."plan" = 'starter' THEN 'croissance'::plan_code
    ELSE 'partenaire_fier'::plan_code
  END,
  CASE 
    WHEN a."plan" = 'gratuit' THEN 1500
    WHEN a."plan" = 'starter' THEN 1200
    ELSE 1000
  END,
  0,
  NULL,
  a."date_debut",
  a."date_fin",
  CASE
    WHEN a."statut" = 'essai' THEN 'active'::statut_periode_abonnement
    WHEN a."statut" = 'actif' THEN 'active'::statut_periode_abonnement
    WHEN a."statut" = 'expire' THEN 'expiree'::statut_periode_abonnement
    WHEN a."statut" = 'suspendu' THEN 'suspendue'::statut_periode_abonnement
    ELSE 'active'::statut_periode_abonnement
  END,
  a."created_at"
FROM "abonnements" a;