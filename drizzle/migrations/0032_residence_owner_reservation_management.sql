-- 0032 : modification et annulation des réservations par le propriétaire

ALTER TABLE "residence_reservations"
  ADD COLUMN IF NOT EXISTS "cancellation_source" varchar(20),
  ADD COLUMN IF NOT EXISTS "cancellation_reason" varchar(500);
