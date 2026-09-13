-- Phase 14 : ne pas reconstruire une notification volontairement retirée avec sa cible.

CREATE OR REPLACE FUNCTION notification_destination_exists(
  destination_type notification_destination_type,
  destination_id varchar
)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT CASE destination_type
    WHEN 'commande' THEN EXISTS (
      SELECT 1 FROM commandes target WHERE target.id = destination_id
    )
    WHEN 'livraison' THEN EXISTS (
      SELECT 1 FROM livraisons target WHERE target.id = destination_id
    )
    WHEN 'reservation_residence' THEN EXISTS (
      SELECT 1 FROM residence_reservations target
      WHERE target.id::text = destination_id
    )
    WHEN 'residence' THEN EXISTS (
      SELECT 1 FROM residences target WHERE target.id::text = destination_id
    )
    WHEN 'restaurant' THEN EXISTS (
      SELECT 1 FROM restaurants target WHERE target.id = destination_id
    )
    WHEN 'profil' THEN EXISTS (
      SELECT 1 FROM restaurants target WHERE target.id = destination_id
    )
    WHEN 'abonnement' THEN EXISTS (
      SELECT 1 FROM subscription_periods target WHERE target.id = destination_id
    ) OR EXISTS (
      SELECT 1 FROM subscription_requests target WHERE target.id = destination_id
    )
    WHEN 'remboursement' THEN EXISTS (
      SELECT 1 FROM transactions target WHERE target.id = destination_id
    )
    WHEN 'commission' THEN EXISTS (
      SELECT 1 FROM commissions target WHERE target.id = destination_id
    )
    WHEN 'remise_especes' THEN EXISTS (
      SELECT 1 FROM driver_cash_remittances target
      WHERE target.id::text = destination_id
    )
    WHEN 'verification_identite' THEN EXISTS (
      SELECT 1 FROM partner_identity_verifications target
      WHERE target.id::text = destination_id
    )
    ELSE true
  END;
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION count_orphan_notifications()
RETURNS integer LANGUAGE sql STABLE AS $$
  SELECT COUNT(*)::integer
  FROM notifications AS notification
  WHERE notification.lien_type IS NOT NULL
    AND NOT notification_destination_exists(
      notification.lien_type,
      notification.lien_id
    );
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION prune_orphan_notifications()
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  deleted_count integer;
BEGIN
  WITH orphaned AS MATERIALIZED (
    SELECT notification.id, notification.event_id
    FROM notifications AS notification
    WHERE notification.lien_type IS NOT NULL
      AND NOT notification_destination_exists(
        notification.lien_type,
        notification.lien_id
      )
  ), retired AS (
    UPDATE event_effect_receipts AS receipt
    SET effect_payload = NULL
    WHERE receipt.effect_type = 'notification.project'
      AND receipt.event_id IN (
        SELECT orphaned.event_id FROM orphaned WHERE orphaned.event_id IS NOT NULL
      )
    RETURNING receipt.id
  )
  DELETE FROM notifications AS notification
  USING orphaned
  WHERE notification.id = orphaned.id
    AND (SELECT COUNT(*) FROM retired) >= 0;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION delete_notification_projections_for_target()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE event_effect_receipts AS receipt
  SET effect_payload = NULL
  WHERE receipt.effect_type = 'notification.project'
    AND receipt.event_id IN (
      SELECT notification.event_id
      FROM notifications AS notification
      WHERE notification.lien_id = OLD.id::text
        AND notification.lien_type::text = ANY(TG_ARGV)
        AND notification.event_id IS NOT NULL
    );
  DELETE FROM notifications
  WHERE lien_id = OLD.id::text
    AND lien_type::text = ANY(TG_ARGV);
  RETURN OLD;
END;
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION delete_archived_residence_notification_projections()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.archived_at IS NULL AND NEW.archived_at IS NOT NULL THEN
    UPDATE event_effect_receipts AS receipt
    SET effect_payload = NULL
    WHERE receipt.effect_type = 'notification.project'
      AND receipt.event_id IN (
        SELECT notification.event_id
        FROM notifications AS notification
        WHERE notification.lien_type = 'residence'
          AND notification.lien_id = NEW.id::text
          AND notification.event_id IS NOT NULL
      );
    DELETE FROM notifications
    WHERE lien_type = 'residence'
      AND lien_id = NEW.id::text;
  END IF;
  RETURN NEW;
END;
$$;
