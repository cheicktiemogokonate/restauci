-- Phase 8 : invariants de propriété, calendrier et traçabilité Résidences.

ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'residence_created';
--> statement-breakpoint
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'residence_updated';
--> statement-breakpoint
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'residence_published';
--> statement-breakpoint
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'residence_withdrawn';
--> statement-breakpoint
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'residence_calendar_blocked';
--> statement-breakpoint
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'residence_calendar_unblocked';
--> statement-breakpoint
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'residence_reservation_created';
--> statement-breakpoint
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'residence_reservation_updated';
--> statement-breakpoint
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'residence_reservation_cancelled';
--> statement-breakpoint
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'residence_reservation_confirmed';
--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM residence_reservations rr
    JOIN residences r ON r.id = rr.residence_id
    WHERE rr.partner_account_id <> r.partner_account_id
  ) THEN
    RAISE EXCEPTION 'residence_reservation_partner_account_mismatch';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM residence_reservations first_booking
    JOIN residence_reservations second_booking
      ON second_booking.residence_id = first_booking.residence_id
      AND second_booking.id > first_booking.id
      AND daterange(second_booking.check_in, second_booking.check_out, '[)')
        && daterange(first_booking.check_in, first_booking.check_out, '[)')
    WHERE first_booking.status <> 'annulee'
      AND second_booking.status <> 'annulee'
  ) THEN
    RAISE EXCEPTION 'residence_reservation_active_overlap';
  END IF;
END $$;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "residences_id_partner_account_unique"
  ON "residences" ("id", "partner_account_id");
--> statement-breakpoint

ALTER TABLE "residence_reservations"
  DROP CONSTRAINT IF EXISTS "residence_reservations_residence_id_residences_id_fk";
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "residence_reservations"
    ADD CONSTRAINT "residence_reservations_residence_partner_fk"
    FOREIGN KEY ("residence_id", "partner_account_id")
    REFERENCES "residences" ("id", "partner_account_id")
    ON DELETE RESTRICT ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "residence_reservations"
    ADD CONSTRAINT "residence_reservations_no_active_overlap"
    EXCLUDE USING gist (
      "residence_id" WITH =,
      daterange("check_in", "check_out", '[)') WITH &&
    )
    WHERE ("status" <> 'annulee');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
