-- 0030 : quarantaine et assainissement obligatoire des justificatifs KYC
--
-- Les objets originaux restent sous identity/quarantine et ne sont jamais
-- servis. Seule la copie clean_storage_key produite par le worker antivirus +
-- CDR est téléchargeable par un partenaire ou un administrateur.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'identity_document_scan_status') THEN
    CREATE TYPE "identity_document_scan_status" AS ENUM (
      'pending', 'processing', 'clean', 'rejected', 'error'
    );
  END IF;
END
$$;

ALTER TABLE "partner_identity_documents"
  ADD COLUMN IF NOT EXISTS "scan_status" "identity_document_scan_status" NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "clean_storage_key" text,
  ADD COLUMN IF NOT EXISTS "clean_content_type" varchar(50),
  ADD COLUMN IF NOT EXISTS "clean_size_bytes" integer,
  ADD COLUMN IF NOT EXISTS "clean_sha256" varchar(64),
  ADD COLUMN IF NOT EXISTS "scan_attempts" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "scan_started_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "scan_completed_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "scan_engine" varchar(100),
  ADD COLUMN IF NOT EXISTS "scan_result" varchar(255),
  ADD COLUMN IF NOT EXISTS "last_scan_error" text;

CREATE UNIQUE INDEX IF NOT EXISTS "partner_identity_documents_clean_storage_key_unique"
  ON "partner_identity_documents" ("clean_storage_key")
  WHERE "clean_storage_key" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "partner_identity_documents_scan_queue_idx"
  ON "partner_identity_documents" ("scan_status", "scan_started_at", "uploaded_at")
  WHERE "scan_status" IN ('pending', 'processing', 'error');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'partner_identity_documents_scan_attempts_valid'
  ) THEN
    ALTER TABLE "partner_identity_documents"
      ADD CONSTRAINT "partner_identity_documents_scan_attempts_valid"
      CHECK ("scan_attempts" >= 0 AND "scan_attempts" <= 10);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'partner_identity_documents_clean_payload_coherent'
  ) THEN
    ALTER TABLE "partner_identity_documents"
      ADD CONSTRAINT "partner_identity_documents_clean_payload_coherent"
      CHECK (
        ("scan_status" = 'clean'
          AND "clean_storage_key" IS NOT NULL
          AND "clean_content_type" IS NOT NULL
          AND "clean_size_bytes" > 0
          AND "clean_sha256" ~ '^[0-9a-f]{64}$'
          AND "scan_completed_at" IS NOT NULL)
        OR
        ("scan_status" <> 'clean'
          AND "clean_storage_key" IS NULL
          AND "clean_content_type" IS NULL
          AND "clean_size_bytes" IS NULL
          AND "clean_sha256" IS NULL)
      );
  END IF;
END
$$;
