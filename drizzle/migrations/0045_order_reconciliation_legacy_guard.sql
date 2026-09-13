-- Phase 14 : permettre le rejeu de la réconciliation sans réécrire les
-- livraisons historiques conservées par une contrainte NOT VALID.

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
    AND (target_order_id IS NULL OR orders.id = target_order_id)
    AND (
      orders.mode_commande <> 'livraison'
      OR (
        orders.adresse_livraison IS NOT NULL
        AND orders.latitude_livraison IS NOT NULL
        AND orders.longitude_livraison IS NOT NULL
      )
    );

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;
