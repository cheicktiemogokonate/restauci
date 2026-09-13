-- Phase 10 : destinations de notification typées et projections causales réparables.

DO $$ BEGIN
  CREATE TYPE "notification_destination_type" AS ENUM (
    'abonnement',
    'commande',
    'commission',
    'livraison',
    'profil',
    'remboursement',
    'remise_especes',
    'reservation_residence',
    'residence',
    'restaurant',
    'verification_identite'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

-- Décision approuvée : les projections dont la cible n'existe plus sont
-- supprimées définitivement. Cette requête supprime les 235 orphelines du
-- snapshot de référence et reste correcte si la base a évolué entre-temps.
DELETE FROM notifications AS notification
WHERE notification.lien_type IS NOT NULL
  AND CASE notification.lien_type
    WHEN 'commande' THEN NOT EXISTS (
      SELECT 1 FROM commandes target WHERE target.id = notification.lien_id
    )
    WHEN 'livraison' THEN NOT EXISTS (
      SELECT 1 FROM livraisons target WHERE target.id = notification.lien_id
    )
    WHEN 'reservation_residence' THEN NOT EXISTS (
      SELECT 1 FROM residence_reservations target
      WHERE target.id::text = notification.lien_id
    )
    WHEN 'residence' THEN NOT EXISTS (
      SELECT 1 FROM residences target WHERE target.id::text = notification.lien_id
    )
    WHEN 'restaurant' THEN NOT EXISTS (
      SELECT 1 FROM restaurants target WHERE target.id = notification.lien_id
    )
    WHEN 'profil' THEN NOT EXISTS (
      SELECT 1 FROM restaurants target WHERE target.id = notification.lien_id
    )
    WHEN 'abonnement' THEN NOT EXISTS (
      SELECT 1 FROM subscription_periods target
      WHERE target.id = notification.lien_id
    ) AND NOT EXISTS (
      SELECT 1 FROM subscription_requests target
      WHERE target.id = notification.lien_id
    )
    WHEN 'remboursement' THEN NOT EXISTS (
      SELECT 1 FROM transactions target
      WHERE target.id = notification.lien_id
    )
    WHEN 'commission' THEN NOT EXISTS (
      SELECT 1 FROM commissions target WHERE target.id = notification.lien_id
    )
    WHEN 'remise_especes' THEN NOT EXISTS (
      SELECT 1 FROM driver_cash_remittances target
      WHERE target.id::text = notification.lien_id
    )
    WHEN 'verification_identite' THEN NOT EXISTS (
      SELECT 1 FROM partner_identity_verifications target
      WHERE target.id::text = notification.lien_id
    )
    ELSE TRUE
  END;
--> statement-breakpoint

ALTER TABLE notifications
  ALTER COLUMN lien_type TYPE notification_destination_type
  USING lien_type::notification_destination_type,
  ALTER COLUMN lien_id TYPE varchar(128),
  ADD COLUMN IF NOT EXISTS event_id uuid,
  ADD COLUMN IF NOT EXISTS correlation_id uuid;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE notifications
    ADD CONSTRAINT notifications_event_id_business_events_id_fk
    FOREIGN KEY (event_id) REFERENCES business_events(id)
    ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE notifications
    ADD CONSTRAINT notifications_destination_coherent
    CHECK ((lien_type IS NULL) = (lien_id IS NULL));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE notifications
    ADD CONSTRAINT notifications_event_correlation_coherent
    CHECK ((event_id IS NULL) = (correlation_id IS NULL));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS notifications_event_idx
  ON notifications(event_id);
CREATE INDEX IF NOT EXISTS notifications_correlation_idx
  ON notifications(correlation_id);
CREATE UNIQUE INDEX IF NOT EXISTS notifications_event_user_unique
  ON notifications(event_id, user_id)
  WHERE event_id IS NOT NULL AND user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS notifications_event_client_unique
  ON notifications(event_id, client_id)
  WHERE event_id IS NOT NULL AND client_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS notifications_event_driver_unique
  ON notifications(event_id, driver_id)
  WHERE event_id IS NOT NULL AND driver_id IS NOT NULL;
--> statement-breakpoint

ALTER TABLE event_effect_receipts
  ADD COLUMN IF NOT EXISTS effect_payload jsonb;
UPDATE event_effect_receipts AS receipt
SET effect_payload = message.payload
FROM outbox_messages AS message
WHERE message.event_id = receipt.event_id
  AND message.effect_type = receipt.effect_type
  AND receipt.effect_payload IS NULL;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION count_orphan_notifications()
RETURNS integer LANGUAGE sql STABLE AS $$
  SELECT COUNT(*)::integer
  FROM notifications AS notification
  WHERE notification.lien_type IS NOT NULL
    AND CASE notification.lien_type
      WHEN 'commande' THEN NOT EXISTS (
        SELECT 1 FROM commandes target WHERE target.id = notification.lien_id
      )
      WHEN 'livraison' THEN NOT EXISTS (
        SELECT 1 FROM livraisons target WHERE target.id = notification.lien_id
      )
      WHEN 'reservation_residence' THEN NOT EXISTS (
        SELECT 1 FROM residence_reservations target
        WHERE target.id::text = notification.lien_id
      )
      WHEN 'residence' THEN NOT EXISTS (
        SELECT 1 FROM residences target WHERE target.id::text = notification.lien_id
      )
      WHEN 'restaurant' THEN NOT EXISTS (
        SELECT 1 FROM restaurants target WHERE target.id = notification.lien_id
      )
      WHEN 'profil' THEN NOT EXISTS (
        SELECT 1 FROM restaurants target WHERE target.id = notification.lien_id
      )
      WHEN 'abonnement' THEN NOT EXISTS (
        SELECT 1 FROM subscription_periods target
        WHERE target.id = notification.lien_id
      ) AND NOT EXISTS (
        SELECT 1 FROM subscription_requests target
        WHERE target.id = notification.lien_id
      )
      WHEN 'remboursement' THEN NOT EXISTS (
        SELECT 1 FROM transactions target
        WHERE target.id = notification.lien_id
      )
      WHEN 'commission' THEN NOT EXISTS (
        SELECT 1 FROM commissions target WHERE target.id = notification.lien_id
      )
      WHEN 'remise_especes' THEN NOT EXISTS (
        SELECT 1 FROM driver_cash_remittances target
        WHERE target.id::text = notification.lien_id
      )
      WHEN 'verification_identite' THEN NOT EXISTS (
        SELECT 1 FROM partner_identity_verifications target
        WHERE target.id::text = notification.lien_id
      )
    END;
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION prune_orphan_notifications()
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM notifications AS notification
  WHERE notification.lien_type IS NOT NULL
    AND CASE notification.lien_type
      WHEN 'commande' THEN NOT EXISTS (
        SELECT 1 FROM commandes target WHERE target.id = notification.lien_id
      )
      WHEN 'livraison' THEN NOT EXISTS (
        SELECT 1 FROM livraisons target WHERE target.id = notification.lien_id
      )
      WHEN 'reservation_residence' THEN NOT EXISTS (
        SELECT 1 FROM residence_reservations target
        WHERE target.id::text = notification.lien_id
      )
      WHEN 'residence' THEN NOT EXISTS (
        SELECT 1 FROM residences target WHERE target.id::text = notification.lien_id
      )
      WHEN 'restaurant' THEN NOT EXISTS (
        SELECT 1 FROM restaurants target WHERE target.id = notification.lien_id
      )
      WHEN 'profil' THEN NOT EXISTS (
        SELECT 1 FROM restaurants target WHERE target.id = notification.lien_id
      )
      WHEN 'abonnement' THEN NOT EXISTS (
        SELECT 1 FROM subscription_periods target
        WHERE target.id = notification.lien_id
      ) AND NOT EXISTS (
        SELECT 1 FROM subscription_requests target
        WHERE target.id = notification.lien_id
      )
      WHEN 'remboursement' THEN NOT EXISTS (
        SELECT 1 FROM transactions target
        WHERE target.id = notification.lien_id
      )
      WHEN 'commission' THEN NOT EXISTS (
        SELECT 1 FROM commissions target WHERE target.id = notification.lien_id
      )
      WHEN 'remise_especes' THEN NOT EXISTS (
        SELECT 1 FROM driver_cash_remittances target
        WHERE target.id::text = notification.lien_id
      )
      WHEN 'verification_identite' THEN NOT EXISTS (
        SELECT 1 FROM partner_identity_verifications target
        WHERE target.id::text = notification.lien_id
      )
    END;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION delete_notification_projections_for_target()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM notifications
  WHERE lien_id = OLD.id::text
    AND lien_type::text = ANY(TG_ARGV);
  RETURN OLD;
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS commandes_delete_notification_projections ON commandes;
CREATE TRIGGER commandes_delete_notification_projections
  AFTER DELETE ON commandes FOR EACH ROW
  EXECUTE FUNCTION delete_notification_projections_for_target('commande');
DROP TRIGGER IF EXISTS livraisons_delete_notification_projections ON livraisons;
CREATE TRIGGER livraisons_delete_notification_projections
  AFTER DELETE ON livraisons FOR EACH ROW
  EXECUTE FUNCTION delete_notification_projections_for_target('livraison');
DROP TRIGGER IF EXISTS residence_reservations_delete_notification_projections ON residence_reservations;
CREATE TRIGGER residence_reservations_delete_notification_projections
  AFTER DELETE ON residence_reservations FOR EACH ROW
  EXECUTE FUNCTION delete_notification_projections_for_target('reservation_residence');
DROP TRIGGER IF EXISTS residences_delete_notification_projections ON residences;
CREATE TRIGGER residences_delete_notification_projections
  AFTER DELETE ON residences FOR EACH ROW
  EXECUTE FUNCTION delete_notification_projections_for_target('residence');
DROP TRIGGER IF EXISTS restaurants_delete_notification_projections ON restaurants;
CREATE TRIGGER restaurants_delete_notification_projections
  AFTER DELETE ON restaurants FOR EACH ROW
  EXECUTE FUNCTION delete_notification_projections_for_target('restaurant', 'profil');
DROP TRIGGER IF EXISTS subscription_periods_delete_notification_projections ON subscription_periods;
CREATE TRIGGER subscription_periods_delete_notification_projections
  AFTER DELETE ON subscription_periods FOR EACH ROW
  EXECUTE FUNCTION delete_notification_projections_for_target('abonnement');
DROP TRIGGER IF EXISTS subscription_requests_delete_notification_projections ON subscription_requests;
CREATE TRIGGER subscription_requests_delete_notification_projections
  AFTER DELETE ON subscription_requests FOR EACH ROW
  EXECUTE FUNCTION delete_notification_projections_for_target('abonnement');
DROP TRIGGER IF EXISTS transactions_delete_notification_projections ON transactions;
CREATE TRIGGER transactions_delete_notification_projections
  AFTER DELETE ON transactions FOR EACH ROW
  EXECUTE FUNCTION delete_notification_projections_for_target('remboursement');
DROP TRIGGER IF EXISTS commissions_delete_notification_projections ON commissions;
CREATE TRIGGER commissions_delete_notification_projections
  AFTER DELETE ON commissions FOR EACH ROW
  EXECUTE FUNCTION delete_notification_projections_for_target('commission');
DROP TRIGGER IF EXISTS driver_cash_remittances_delete_notification_projections ON driver_cash_remittances;
CREATE TRIGGER driver_cash_remittances_delete_notification_projections
  AFTER DELETE ON driver_cash_remittances FOR EACH ROW
  EXECUTE FUNCTION delete_notification_projections_for_target('remise_especes');
DROP TRIGGER IF EXISTS identity_verifications_delete_notification_projections ON partner_identity_verifications;
CREATE TRIGGER identity_verifications_delete_notification_projections
  AFTER DELETE ON partner_identity_verifications FOR EACH ROW
  EXECUTE FUNCTION delete_notification_projections_for_target('verification_identite');
--> statement-breakpoint

CREATE OR REPLACE FUNCTION delete_archived_residence_notification_projections()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.archived_at IS NULL AND NEW.archived_at IS NOT NULL THEN
    DELETE FROM notifications
    WHERE lien_type = 'residence'
      AND lien_id = NEW.id::text;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS residences_archive_notification_projections ON residences;
CREATE TRIGGER residences_archive_notification_projections
  AFTER UPDATE OF archived_at ON residences FOR EACH ROW
  EXECUTE FUNCTION delete_archived_residence_notification_projections();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION rebuild_causal_projections()
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  rebuilt_count integer := 0;
  affected_count integer := 0;
BEGIN
  WITH missing AS (
    SELECT receipt.event_id, receipt.effect_type, receipt.effect_payload
    FROM event_effect_receipts AS receipt
    WHERE receipt.effect_payload IS NOT NULL
      AND (
        (
          receipt.effect_type = 'audit.project'
          AND NOT EXISTS (
            SELECT 1 FROM audit_log projection
            WHERE projection.event_id = receipt.event_id
          )
        ) OR (
          receipt.effect_type = 'notification.project'
          AND (
            SELECT COUNT(*) FROM notifications projection
            WHERE projection.event_id = receipt.event_id
          ) < jsonb_array_length(receipt.effect_payload -> 'items')
        )
      )
  )
  UPDATE outbox_messages AS message
  SET status = 'retry',
      payload = missing.effect_payload,
      attempts = 0,
      available_at = NOW(),
      locked_at = NULL,
      completed_at = NULL,
      resolved_at = NULL,
      last_error_code = NULL,
      updated_at = NOW()
  FROM missing
  WHERE message.event_id = missing.event_id
    AND message.effect_type = missing.effect_type;
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  rebuilt_count := rebuilt_count + affected_count;

  WITH missing AS (
    SELECT receipt.event_id, receipt.effect_type, receipt.effect_payload
    FROM event_effect_receipts AS receipt
    WHERE receipt.effect_payload IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM outbox_messages message
        WHERE message.event_id = receipt.event_id
          AND message.effect_type = receipt.effect_type
      )
      AND (
        (
          receipt.effect_type = 'audit.project'
          AND NOT EXISTS (
            SELECT 1 FROM audit_log projection
            WHERE projection.event_id = receipt.event_id
          )
        ) OR (
          receipt.effect_type = 'notification.project'
          AND (
            SELECT COUNT(*) FROM notifications projection
            WHERE projection.event_id = receipt.event_id
          ) < jsonb_array_length(receipt.effect_payload -> 'items')
        )
      )
  )
  INSERT INTO outbox_messages (
    id, event_id, effect_type, payload, status, attempts, max_attempts,
    available_at, created_at, updated_at
  )
  SELECT gen_random_uuid(), event_id, effect_type, effect_payload,
    'retry', 0, 5, NOW(), NOW(), NOW()
  FROM missing;
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  rebuilt_count := rebuilt_count + affected_count;

  DELETE FROM event_effect_receipts AS receipt
  WHERE EXISTS (
    SELECT 1 FROM outbox_messages AS message
    WHERE message.event_id = receipt.event_id
      AND message.effect_type = receipt.effect_type
      AND message.status = 'retry'
  );

  RETURN rebuilt_count;
END;
$$;
