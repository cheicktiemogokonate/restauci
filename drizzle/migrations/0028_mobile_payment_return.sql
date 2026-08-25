ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "return_channel" varchar(10) NOT NULL DEFAULT 'web';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payments_return_channel_check'
  ) THEN
    ALTER TABLE "payments"
      ADD CONSTRAINT "payments_return_channel_check"
      CHECK ("return_channel" IN ('web', 'mobile'));
  END IF;
END $$;
