-- Répare la dérive observée sur la base de développement : la table figure
-- dans le schéma et dans 0001, mais avait été supprimée de la base auditée.
CREATE TABLE IF NOT EXISTS "push_subscriptions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"type" varchar(20) NOT NULL,
	"endpoint" text,
	"p256dh" text,
	"auth" text,
	"expo_token" text,
	"user_agent" text,
	"created_at" timestamp with time zone NOT NULL,
	"last_used_at" timestamp with time zone,
	CONSTRAINT "push_subscriptions_user_id_users_id_fk"
		FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_push_subscriptions_user" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_push_subscriptions_type" ON "push_subscriptions" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_push_subscriptions_endpoint" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint

-- Nettoyage contrôlé des données de test issues de l'ancien seed ×100.
-- Le restaurant, les noms et les anciennes valeurs exactes identifient la
-- provenance ; aucune heuristique par seuil n'est conservée dans l'application.
UPDATE "restaurants"
SET
	"frais_livraison" = CASE WHEN "frais_livraison" = 150000 THEN 1500 ELSE "frais_livraison" END,
	"commande_minimum" = CASE WHEN "commande_minimum" = 500000 THEN 5000 ELSE "commande_minimum" END,
	"updated_at" = now()
WHERE "slug" = 'bella-italia-abidjan'
	AND ("frais_livraison" = 150000 OR "commande_minimum" = 500000);--> statement-breakpoint

UPDATE "plats" p
SET
	"prix" = CASE
		WHEN p."nom" = 'Smokey Supreme Pizza' AND p."prix" = 1200000 THEN 12000
		WHEN p."nom" = 'Margherita' AND p."prix" = 900000 THEN 9000
		WHEN p."nom" = 'Spaghetti Carbonara' AND p."prix" = 1500000 THEN 15000
		WHEN p."nom" = 'Penne à la crème' AND p."prix" = 1800000 THEN 18000
		WHEN p."nom" = 'Cheeseburger classique' AND p."prix" = 1000000 THEN 10000
		WHEN p."nom" = 'Salade César' AND p."prix" = 800000 THEN 8000
		WHEN p."nom" = 'Moelleux au chocolat' AND p."prix" = 1000000 THEN 10000
		WHEN p."nom" = 'Eau minérale' AND p."prix" = 200000 THEN 2000
		WHEN p."nom" = 'Coca-Cola' AND p."prix" = 350000 THEN 3500
		ELSE p."prix"
	END,
	"updated_at" = now()
FROM "restaurants" r
WHERE p."restaurant_id" = r."id"
	AND r."slug" = 'bella-italia-abidjan';--> statement-breakpoint

WITH "commandes_normalisees" AS (
	SELECT
		c."id",
		jsonb_agg(
			item || jsonb_build_object(
				'prix',
				CASE
					WHEN item->>'nom' = 'Smokey Supreme Pizza' AND (item->>'prix')::integer = 1200000 THEN 12000
					WHEN item->>'nom' = 'Margherita' AND (item->>'prix')::integer = 900000 THEN 9000
					WHEN item->>'nom' = 'Spaghetti Carbonara' AND (item->>'prix')::integer = 1500000 THEN 15000
					WHEN item->>'nom' = 'Penne à la crème' AND (item->>'prix')::integer = 1800000 THEN 18000
					WHEN item->>'nom' = 'Cheeseburger classique' AND (item->>'prix')::integer = 1000000 THEN 10000
					WHEN item->>'nom' = 'Salade César' AND (item->>'prix')::integer = 800000 THEN 8000
					WHEN item->>'nom' = 'Moelleux au chocolat' AND (item->>'prix')::integer = 1000000 THEN 10000
					WHEN item->>'nom' = 'Eau minérale' AND (item->>'prix')::integer = 200000 THEN 2000
					WHEN item->>'nom' = 'Coca-Cola' AND (item->>'prix')::integer = 350000 THEN 3500
					ELSE (item->>'prix')::integer
				END
			) ORDER BY position
		) AS "items",
		sum(
			(CASE
				WHEN item->>'nom' = 'Smokey Supreme Pizza' AND (item->>'prix')::integer = 1200000 THEN 12000
				WHEN item->>'nom' = 'Margherita' AND (item->>'prix')::integer = 900000 THEN 9000
				WHEN item->>'nom' = 'Spaghetti Carbonara' AND (item->>'prix')::integer = 1500000 THEN 15000
				WHEN item->>'nom' = 'Penne à la crème' AND (item->>'prix')::integer = 1800000 THEN 18000
				WHEN item->>'nom' = 'Cheeseburger classique' AND (item->>'prix')::integer = 1000000 THEN 10000
				WHEN item->>'nom' = 'Salade César' AND (item->>'prix')::integer = 800000 THEN 8000
				WHEN item->>'nom' = 'Moelleux au chocolat' AND (item->>'prix')::integer = 1000000 THEN 10000
				WHEN item->>'nom' = 'Eau minérale' AND (item->>'prix')::integer = 200000 THEN 2000
				WHEN item->>'nom' = 'Coca-Cola' AND (item->>'prix')::integer = 350000 THEN 3500
				ELSE (item->>'prix')::integer
			END) * (item->>'quantite')::integer
		)::integer AS "sous_total"
	FROM "commandes" c
	INNER JOIN "restaurants" r ON r."id" = c."restaurant_id"
	CROSS JOIN LATERAL jsonb_array_elements(c."items") WITH ORDINALITY AS items(item, position)
	WHERE r."slug" = 'bella-italia-abidjan'
	GROUP BY c."id"
)
UPDATE "commandes" c
SET
	"items" = n."items",
	"sous_total" = n."sous_total",
	"frais_livraison" = CASE WHEN c."frais_livraison" = 150000 THEN 1500 ELSE c."frais_livraison" END,
	"total" = n."sous_total" + CASE WHEN c."frais_livraison" = 150000 THEN 1500 ELSE c."frais_livraison" END - c."remise",
	"updated_at" = now()
FROM "commandes_normalisees" n
WHERE c."id" = n."id";--> statement-breakpoint

UPDATE "commissions" co
SET
	"montant_commande" = c."total",
	"montant_commission" = round((c."total"::numeric * co."taux_commission_bps") / 10000)::integer
FROM "commandes" c
WHERE co."commande_id" = c."id"
	AND (co."montant_commande" <> c."total"
		OR co."montant_commission" <> round((c."total"::numeric * co."taux_commission_bps") / 10000)::integer);--> statement-breakpoint

ALTER TABLE "abonnements" DROP CONSTRAINT "abonnements_restaurant_id_restaurants_id_fk";
--> statement-breakpoint
ALTER TABLE "commission_settlements" DROP CONSTRAINT "commission_settlements_restaurant_id_restaurants_id_fk";
--> statement-breakpoint
ALTER TABLE "commission_settlements" DROP CONSTRAINT "commission_settlements_admin_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "commissions" DROP CONSTRAINT "commissions_commande_id_commandes_id_fk";
--> statement-breakpoint
ALTER TABLE "commissions" DROP CONSTRAINT "commissions_restaurant_id_restaurants_id_fk";
--> statement-breakpoint
ALTER TABLE "paiements" DROP CONSTRAINT "paiements_commande_id_commandes_id_fk";
--> statement-breakpoint
ALTER TABLE "subscription_periods" DROP CONSTRAINT "subscription_periods_restaurant_id_restaurants_id_fk";
--> statement-breakpoint
ALTER TABLE "subscription_requests" DROP CONSTRAINT "subscription_requests_restaurant_id_restaurants_id_fk";
--> statement-breakpoint
ALTER TABLE "abonnements" ADD CONSTRAINT "abonnements_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_settlements" ADD CONSTRAINT "commission_settlements_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_settlements" ADD CONSTRAINT "commission_settlements_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_commande_id_commandes_id_fk" FOREIGN KEY ("commande_id") REFERENCES "public"."commandes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_commande_id_commandes_id_fk" FOREIGN KEY ("commande_id") REFERENCES "public"."commandes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_periods" ADD CONSTRAINT "subscription_periods_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_requests" ADD CONSTRAINT "subscription_requests_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_total_depense_non_negatif" CHECK ("clients"."total_depense" >= 0);--> statement-breakpoint
ALTER TABLE "commandes" ADD CONSTRAINT "commandes_montants_non_negatifs" CHECK ("commandes"."sous_total" >= 0 AND "commandes"."frais_livraison" >= 0 AND "commandes"."remise" >= 0 AND "commandes"."total" >= 0);--> statement-breakpoint
ALTER TABLE "commandes" ADD CONSTRAINT "commandes_total_coherent" CHECK ("commandes"."total" = "commandes"."sous_total" + "commandes"."frais_livraison" - "commandes"."remise");--> statement-breakpoint
ALTER TABLE "commission_settlements" ADD CONSTRAINT "commission_settlements_montant_total_non_negatif" CHECK ("commission_settlements"."montant_total" >= 0);--> statement-breakpoint
ALTER TABLE "commission_settlements" ADD CONSTRAINT "commission_settlements_nombre_commissions_positif" CHECK ("commission_settlements"."nombre_commissions" > 0);--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_montants_non_negatifs" CHECK ("commissions"."montant_commande" >= 0 AND "commissions"."montant_commission" >= 0);--> statement-breakpoint
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_montant_non_negatif" CHECK ("paiements"."montant" >= 0);--> statement-breakpoint
ALTER TABLE "plats" ADD CONSTRAINT "plats_prix_positif" CHECK ("plats"."prix" > 0);--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_valeur_non_negative" CHECK ("promotions"."valeur" >= 0);--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_montant_min_commande_non_negatif" CHECK ("promotions"."montant_min_commande" >= 0);--> statement-breakpoint
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_frais_livraison_non_negatif" CHECK ("restaurants"."frais_livraison" >= 0);--> statement-breakpoint
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_commande_minimum_non_negative" CHECK ("restaurants"."commande_minimum" >= 0);--> statement-breakpoint
ALTER TABLE "subscription_periods" ADD CONSTRAINT "subscription_periods_prix_paye_fcfa_non_negatif" CHECK ("subscription_periods"."prix_paye_fcfa" >= 0);--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_prix_annuel_fcfa_non_negatif" CHECK ("subscription_plans"."prix_annuel_fcfa" >= 0);--> statement-breakpoint
ALTER TABLE "subscription_requests" ADD CONSTRAINT "subscription_requests_prix_fige_fcfa_non_negatif" CHECK ("subscription_requests"."prix_fige_fcfa" >= 0);
