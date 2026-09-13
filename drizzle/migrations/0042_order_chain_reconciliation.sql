-- Phase 9 : chaîne Restaurant order-to-cash, projections recalculables et
-- marquage explicite des commandes historiques incomplètes.

ALTER TABLE "commandes"
  ADD COLUMN IF NOT EXISTS "reconciliation_state" varchar(24) NOT NULL DEFAULT 'complete',
  ADD COLUMN IF NOT EXISTS "reconciliation_issues" text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS "reconciled_at" timestamptz NOT NULL DEFAULT now();
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "commandes"
    ADD CONSTRAINT "commandes_reconciliation_state_valid"
    CHECK ("reconciliation_state" IN ('complete', 'legacy_incomplete'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "commandes"
    ADD CONSTRAINT "commandes_reconciliation_issues_coherent"
    CHECK (
      ("reconciliation_state" = 'complete' AND cardinality("reconciliation_issues") = 0)
      OR
      ("reconciliation_state" = 'legacy_incomplete' AND cardinality("reconciliation_issues") > 0)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

CREATE OR REPLACE VIEW "client_order_projections" AS
SELECT
  client.id AS client_id,
  COUNT(orders.id) FILTER (WHERE orders.statut = 'servie')::integer AS completed_order_count,
  COALESCE(SUM(orders.total) FILTER (WHERE orders.statut = 'servie'), 0)::bigint AS completed_spend_fcfa
FROM clients client
LEFT JOIN commandes orders ON orders.client_id = client.id
GROUP BY client.id;
--> statement-breakpoint

CREATE OR REPLACE VIEW "restaurant_order_projections" AS
SELECT
  restaurant.id AS restaurant_id,
  COUNT(orders.id) FILTER (WHERE orders.statut = 'servie')::integer AS completed_order_count,
  COALESCE(SUM(orders.total) FILTER (WHERE orders.statut = 'servie'), 0)::bigint AS completed_revenue_fcfa
FROM restaurants restaurant
LEFT JOIN commandes orders ON orders.restaurant_id = restaurant.id
GROUP BY restaurant.id;
--> statement-breakpoint

CREATE OR REPLACE VIEW "dish_order_projections" AS
SELECT
  dish.id AS dish_id,
  dish.restaurant_id,
  COALESCE(SUM((item.value ->> 'quantite')::integer), 0)::bigint AS completed_quantity,
  COALESCE(SUM((item.value ->> 'totalLigne')::integer), 0)::bigint AS completed_revenue_fcfa
FROM plats dish
LEFT JOIN commandes orders
  ON orders.restaurant_id = dish.restaurant_id
  AND orders.statut = 'servie'
LEFT JOIN LATERAL jsonb_array_elements(orders.items) item(value)
  ON item.value ->> 'platId' = dish.id
GROUP BY dish.id, dish.restaurant_id;
--> statement-breakpoint

CREATE OR REPLACE VIEW "restaurant_order_chain_health" AS
SELECT
  orders.id AS order_id,
  ARRAY_REMOVE(ARRAY[
    CASE WHEN orders.client_id IS NULL THEN 'client_missing' END,
    CASE WHEN transaction.id IS NULL THEN 'transaction_missing' END,
    CASE WHEN transaction.id IS NOT NULL AND transaction.type <> 'commande_restaurant' THEN 'transaction_type_mismatch' END,
    CASE WHEN transaction.id IS NOT NULL AND transaction.partner_account_id <> restaurant.partner_account_id THEN 'transaction_partner_mismatch' END,
    CASE WHEN transaction.id IS NOT NULL AND transaction.client_id IS DISTINCT FROM orders.client_id THEN 'transaction_client_mismatch' END,
    CASE WHEN transaction.id IS NOT NULL AND transaction.amount_fcfa <> orders.total THEN 'transaction_amount_mismatch' END,
    CASE WHEN COALESCE(payment.payment_count, 0) = 0 THEN 'payment_missing' END,
    CASE WHEN COALESCE(payment.payment_count, 0) > 0 AND NOT payment.has_matching_amount THEN 'payment_amount_mismatch' END,
    CASE WHEN commission.id IS NULL THEN 'commission_missing' END,
    CASE WHEN commission.id IS NOT NULL AND commission.partner_account_id <> restaurant.partner_account_id THEN 'commission_partner_mismatch' END,
    CASE WHEN commission.id IS NOT NULL AND commission.base_amount_fcfa <> orders.sous_total + orders.frais_livraison THEN 'commission_base_mismatch' END,
    CASE WHEN commission.id IS NOT NULL AND commission.amount_fcfa <> (((commission.base_amount_fcfa::bigint * commission.rate_bps_snapshot::bigint) + 5000) / 10000)::integer THEN 'commission_amount_mismatch' END,
    CASE WHEN commission.id IS NOT NULL AND payment.has_cash AND commission.collection_mode <> 'cash_receivable' THEN 'commission_collection_mode_mismatch' END,
    CASE WHEN commission.id IS NOT NULL AND COALESCE(payment.has_cash, false) = false AND commission.collection_mode <> 'provider_split' THEN 'commission_collection_mode_mismatch' END,
    CASE WHEN transaction.id IS NOT NULL AND (
      (orders.statut = 'en_attente_paiement' AND transaction.status <> 'pending')
      OR (orders.statut IN ('recue', 'en_preparation', 'prete') AND COALESCE(payment.has_cash, false) AND transaction.status <> 'pending')
      OR (orders.statut IN ('recue', 'en_preparation', 'prete') AND COALESCE(payment.has_cash, false) = false AND transaction.status <> 'paid')
      OR (orders.statut = 'servie' AND transaction.status <> 'paid')
      OR (orders.statut = 'annulee' AND transaction.status <> 'cancelled')
    ) THEN 'transaction_lifecycle_mismatch' END,
    CASE WHEN commission.id IS NOT NULL AND (
      (orders.statut NOT IN ('servie', 'annulee') AND commission.commercial_status <> 'pending')
      OR (orders.statut = 'servie' AND commission.commercial_status <> 'due')
      OR (orders.statut = 'annulee' AND commission.commercial_status <> 'void')
    ) THEN 'commission_lifecycle_mismatch' END,
    CASE WHEN orders.mode_commande = 'livraison' AND orders.statut = 'servie'
      AND (delivery.id IS NULL OR delivery.statut <> 'livree' OR delivery.proof_verified_at IS NULL)
      THEN 'delivery_completion_mismatch' END,
    CASE WHEN orders.mode_commande = 'livraison' AND orders.statut = 'servie'
      AND COALESCE(payment.has_cash, false)
      AND (delivery.cash_collected_at IS NULL OR delivery.cash_collected_amount_fcfa <> orders.total)
      THEN 'delivery_cash_collection_mismatch' END
  ], NULL)::text[] AS issues
FROM commandes orders
INNER JOIN restaurants restaurant ON restaurant.id = orders.restaurant_id
LEFT JOIN transactions transaction ON transaction.restaurant_order_id = orders.id
LEFT JOIN commissions commission ON commission.commande_id = orders.id
LEFT JOIN livraisons delivery ON delivery.commande_id = orders.id
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::integer AS payment_count,
    BOOL_OR(candidate.amount_fcfa = orders.total) AS has_matching_amount,
    BOOL_OR(candidate.method = 'cash') AS has_cash
  FROM payments candidate
  WHERE candidate.transaction_id = transaction.id
) payment ON true;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION "refresh_restaurant_order_reconciliation"(
  target_order_id varchar DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE commandes orders
  SET
    reconciliation_state = CASE
      WHEN cardinality(health.issues) = 0 THEN 'complete'
      ELSE 'legacy_incomplete'
    END,
    reconciliation_issues = health.issues,
    reconciled_at = now()
  FROM restaurant_order_chain_health health
  WHERE health.order_id = orders.id
    AND (target_order_id IS NULL OR orders.id = target_order_id);

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;
--> statement-breakpoint

-- La contrainte géographique Phase 2 est volontairement NOT VALID afin de
-- conserver les anciennes livraisons sans géolocalisation. Un UPDATE, même
-- limité aux colonnes de réconciliation, la réévalue : on la suspend donc
-- uniquement pendant le marquage historique, puis on la rétablit pour toutes
-- les nouvelles écritures.
ALTER TABLE "commandes"
  DROP CONSTRAINT IF EXISTS "commandes_livraison_location_coherent";
--> statement-breakpoint

SELECT refresh_restaurant_order_reconciliation(NULL);
--> statement-breakpoint

ALTER TABLE "commandes"
  ADD CONSTRAINT "commandes_livraison_location_coherent"
  CHECK (
    "mode_commande" <> 'livraison'
    OR (
      "adresse_livraison" IS NOT NULL
      AND "latitude_livraison" IS NOT NULL
      AND "longitude_livraison" IS NOT NULL
    )
  ) NOT VALID;
