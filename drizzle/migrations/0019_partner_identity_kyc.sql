DO $$ BEGIN
  CREATE TYPE "identity_verification_status" AS ENUM ('not_submitted', 'pending', 'verified', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "identity_document_type" AS ENUM ('national_id', 'passport');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "identity_document_side" AS ENUM ('front', 'back');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'identity_verification_verified';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'identity_verification_rejected';

CREATE TABLE IF NOT EXISTS "partner_identity_verifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "partner_account_id" uuid NOT NULL,
  "status" "identity_verification_status" DEFAULT 'not_submitted' NOT NULL,
  "legal_name" varchar(255),
  "document_type" "identity_document_type",
  "document_country_code" varchar(2),
  "document_expires_on" date,
  "rejection_reason" text,
  "submitted_at" timestamptz,
  "reviewed_at" timestamptz,
  "reviewed_by_admin_id" varchar(36),
  "verified_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "partner_identity_verifications_partner_fk"
    FOREIGN KEY ("partner_account_id") REFERENCES "partner_accounts"("id") ON DELETE restrict,
  CONSTRAINT "partner_identity_verifications_reviewed_by_admin_fk"
    FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "users"("id") ON DELETE restrict,
  CONSTRAINT "partner_identity_verifications_country_code_valid"
    CHECK ("document_country_code" IS NULL OR "document_country_code" ~ '^[A-Z]{2}$'),
  CONSTRAINT "partner_identity_verifications_lifecycle_coherent" CHECK (
    ("status" = 'not_submitted' AND "submitted_at" IS NULL AND "reviewed_at" IS NULL AND "reviewed_by_admin_id" IS NULL AND "verified_at" IS NULL AND "rejection_reason" IS NULL)
    OR ("status" = 'pending' AND "legal_name" IS NOT NULL AND "document_type" IS NOT NULL AND "document_country_code" IS NOT NULL AND "document_expires_on" IS NOT NULL AND "submitted_at" IS NOT NULL AND "reviewed_at" IS NULL AND "reviewed_by_admin_id" IS NULL AND "verified_at" IS NULL AND "rejection_reason" IS NULL)
    OR ("status" = 'verified' AND "legal_name" IS NOT NULL AND "document_type" IS NOT NULL AND "document_country_code" IS NOT NULL AND "document_expires_on" IS NOT NULL AND "submitted_at" IS NOT NULL AND "reviewed_at" IS NOT NULL AND "reviewed_by_admin_id" IS NOT NULL AND "verified_at" IS NOT NULL AND "rejection_reason" IS NULL)
    OR ("status" = 'rejected' AND "legal_name" IS NOT NULL AND "document_type" IS NOT NULL AND "document_country_code" IS NOT NULL AND "document_expires_on" IS NOT NULL AND "submitted_at" IS NOT NULL AND "reviewed_at" IS NOT NULL AND "reviewed_by_admin_id" IS NOT NULL AND "verified_at" IS NULL AND length(trim("rejection_reason")) >= 10)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS "partner_identity_verifications_partner_unique"
  ON "partner_identity_verifications" ("partner_account_id");
CREATE INDEX IF NOT EXISTS "partner_identity_verifications_pending_review_idx"
  ON "partner_identity_verifications" ("submitted_at", "id")
  WHERE "status" = 'pending';
CREATE INDEX IF NOT EXISTS "partner_identity_verifications_reviewed_by_admin_idx"
  ON "partner_identity_verifications" ("reviewed_by_admin_id");

CREATE TABLE IF NOT EXISTS "partner_identity_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "verification_id" uuid NOT NULL,
  "side" "identity_document_side" NOT NULL,
  "storage_key" text NOT NULL,
  "content_type" varchar(50) NOT NULL,
  "size_bytes" integer NOT NULL,
  "sha256" varchar(64) NOT NULL,
  "uploaded_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "partner_identity_documents_verification_fk"
    FOREIGN KEY ("verification_id") REFERENCES "partner_identity_verifications"("id") ON DELETE restrict,
  CONSTRAINT "partner_identity_documents_content_type_valid"
    CHECK ("content_type" IN ('image/jpeg', 'image/png', 'application/pdf')),
  CONSTRAINT "partner_identity_documents_size_valid"
    CHECK ("size_bytes" > 0 AND "size_bytes" <= 8388608),
  CONSTRAINT "partner_identity_documents_sha256_valid"
    CHECK ("sha256" ~ '^[0-9a-f]{64}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS "partner_identity_documents_verification_side_unique"
  ON "partner_identity_documents" ("verification_id", "side");
CREATE UNIQUE INDEX IF NOT EXISTS "partner_identity_documents_storage_key_unique"
  ON "partner_identity_documents" ("storage_key");
