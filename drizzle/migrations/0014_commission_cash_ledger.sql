ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'politique_commission_modifiee';
--> statement-breakpoint
ALTER TYPE "public"."type_notification" ADD VALUE IF NOT EXISTS 'commission_cash_threshold';
--> statement-breakpoint
DROP TABLE IF EXISTS "commissions" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "commission_settlements" CASCADE;
--> statement-breakpoint
CREATE TYPE "public"."commission_commercial_status" AS ENUM ('pending', 'due', 'void');
--> statement-breakpoint
CREATE TYPE "public"."commission_collection_mode" AS ENUM ('cash_receivable', 'provider_split');
--> statement-breakpoint
CREATE TYPE "public"."commission_settlement_source" AS ENUM ('manual_admin', 'provider_recovery');
--> statement-breakpoint
CREATE TYPE "public"."commission_settlement_status" AS ENUM ('pending', 'confirmed', 'failed', 'void');
--> statement-breakpoint
CREATE TABLE "commission_policy_settings" (
  "id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
  "cash_debt_threshold_fcfa" integer DEFAULT 10000 NOT NULL,
  "cash_grace_days" integer DEFAULT 7 NOT NULL,
  "cash_debt_recovery_max_bps" integer DEFAULT 5000 NOT NULL,
  "updated_at" timestamp with time zone NOT NULL,
  CONSTRAINT "commission_policy_settings_singleton" CHECK ("id" = 1),
  CONSTRAINT "commission_policy_settings_threshold_valid" CHECK ("cash_debt_threshold_fcfa" >= 0),
  CONSTRAINT "commission_policy_settings_grace_valid" CHECK ("cash_grace_days" >= 0),
  CONSTRAINT "commission_policy_settings_recovery_valid" CHECK ("cash_debt_recovery_max_bps" BETWEEN 0 AND 5000)
);
--> statement-breakpoint
INSERT INTO "commission_policy_settings" ("id", "cash_debt_threshold_fcfa", "cash_grace_days", "cash_debt_recovery_max_bps", "updated_at")
VALUES (1, 10000, 7, 5000, NOW());
--> statement-breakpoint
CREATE TABLE "commission_settlements" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "partner_account_id" uuid NOT NULL,
  "admin_id" varchar(36),
  "source" "commission_settlement_source" NOT NULL,
  "statut" "commission_settlement_status" DEFAULT 'confirmed' NOT NULL,
  "montant_fcfa" integer NOT NULL,
  "moyen_reglement" "moyen_reglement",
  "reference_externe" varchar(255) NOT NULL,
  "justification" text NOT NULL,
  "paid_at" timestamp with time zone NOT NULL,
  "confirmed_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone NOT NULL,
  CONSTRAINT "commission_settlements_montant_positif" CHECK ("montant_fcfa" > 0),
  CONSTRAINT "commission_settlements_manual_admin_coherent" CHECK ("source" <> 'manual_admin' OR ("admin_id" IS NOT NULL AND "moyen_reglement" IS NOT NULL AND "statut" = 'confirmed' AND "confirmed_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "commission_debt_cycles" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "partner_account_id" uuid NOT NULL,
  "threshold_snapshot_fcfa" integer NOT NULL,
  "grace_days_snapshot" integer NOT NULL,
  "triggered_at" timestamp with time zone NOT NULL,
  "notified_at" timestamp with time zone,
  "closed_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone NOT NULL,
  CONSTRAINT "commission_debt_cycles_snapshots_valid" CHECK ("threshold_snapshot_fcfa" >= 0 AND "grace_days_snapshot" >= 0),
  CONSTRAINT "commission_debt_cycles_closure_valid" CHECK ("closed_at" IS NULL OR "closed_at" >= "triggered_at")
);
--> statement-breakpoint
CREATE TABLE "commissions" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "commande_id" varchar(36) NOT NULL,
  "partner_account_id" uuid NOT NULL,
  "base_amount_fcfa" integer NOT NULL,
  "rate_bps_snapshot" integer NOT NULL,
  "amount_fcfa" integer NOT NULL,
  "commercial_status" "commission_commercial_status" DEFAULT 'pending' NOT NULL,
  "collection_mode" "commission_collection_mode" NOT NULL,
  "due_at" timestamp with time zone,
  "voided_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone NOT NULL,
  CONSTRAINT "commissions_commande_id_unique" UNIQUE ("commande_id"),
  CONSTRAINT "commissions_amounts_valid" CHECK ("base_amount_fcfa" >= 0 AND "amount_fcfa" >= 0 AND "amount_fcfa" <= "base_amount_fcfa"),
  CONSTRAINT "commissions_rate_valid" CHECK ("rate_bps_snapshot" BETWEEN 0 AND 10000),
  CONSTRAINT "commissions_lifecycle_valid" CHECK (("commercial_status" = 'pending' AND "due_at" IS NULL AND "voided_at" IS NULL) OR ("commercial_status" = 'due' AND "due_at" IS NOT NULL AND "voided_at" IS NULL) OR ("commercial_status" = 'void' AND "due_at" IS NULL AND "voided_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "commission_settlement_allocations" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "settlement_id" varchar(36) NOT NULL,
  "commission_id" varchar(36) NOT NULL,
  "amount_fcfa" integer NOT NULL,
  "created_at" timestamp with time zone NOT NULL,
  CONSTRAINT "commission_allocations_settlement_commission_unique" UNIQUE ("settlement_id", "commission_id"),
  CONSTRAINT "commission_allocations_amount_positive" CHECK ("amount_fcfa" > 0)
);
--> statement-breakpoint
ALTER TABLE "commission_settlements" ADD CONSTRAINT "commission_settlements_partner_account_id_fk" FOREIGN KEY ("partner_account_id") REFERENCES "public"."partner_accounts"("id") ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE "commission_settlements" ADD CONSTRAINT "commission_settlements_admin_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE "commission_debt_cycles" ADD CONSTRAINT "commission_debt_cycles_partner_account_id_fk" FOREIGN KEY ("partner_account_id") REFERENCES "public"."partner_accounts"("id") ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_commande_id_fk" FOREIGN KEY ("commande_id") REFERENCES "public"."commandes"("id") ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_partner_account_id_fk" FOREIGN KEY ("partner_account_id") REFERENCES "public"."partner_accounts"("id") ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE "commission_settlement_allocations" ADD CONSTRAINT "commission_allocations_settlement_id_fk" FOREIGN KEY ("settlement_id") REFERENCES "public"."commission_settlements"("id") ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE "commission_settlement_allocations" ADD CONSTRAINT "commission_allocations_commission_id_fk" FOREIGN KEY ("commission_id") REFERENCES "public"."commissions"("id") ON DELETE restrict;
--> statement-breakpoint
CREATE INDEX "commission_settlements_partner_idx" ON "commission_settlements" ("partner_account_id");
CREATE INDEX "commission_settlements_partner_paid_at_idx" ON "commission_settlements" ("partner_account_id", "paid_at");
CREATE UNIQUE INDEX "commission_settlements_source_reference_unique" ON "commission_settlements" ("source", "reference_externe");
CREATE INDEX "commission_debt_cycles_partner_idx" ON "commission_debt_cycles" ("partner_account_id");
CREATE UNIQUE INDEX "commission_debt_cycles_one_active_per_partner" ON "commission_debt_cycles" ("partner_account_id") WHERE "closed_at" IS NULL;
CREATE INDEX "commissions_partner_idx" ON "commissions" ("partner_account_id");
CREATE INDEX "commissions_commercial_status_idx" ON "commissions" ("commercial_status");
CREATE INDEX "commissions_partner_cash_due_idx" ON "commissions" ("partner_account_id", "due_at", "created_at", "id") WHERE "commercial_status" = 'due' AND "collection_mode" = 'cash_receivable';
CREATE INDEX "commission_allocations_commission_idx" ON "commission_settlement_allocations" ("commission_id");
CREATE INDEX "commission_allocations_settlement_idx" ON "commission_settlement_allocations" ("settlement_id");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."enforce_commission_allocation"() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  commission_partner uuid;
  commission_amount integer;
  commission_status commission_commercial_status;
  commission_mode commission_collection_mode;
  settlement_partner uuid;
  settlement_amount integer;
  settlement_status commission_settlement_status;
  already_on_commission bigint;
  already_on_settlement bigint;
BEGIN
  SELECT partner_account_id, amount_fcfa, commercial_status, collection_mode
    INTO commission_partner, commission_amount, commission_status, commission_mode
    FROM commissions WHERE id = NEW.commission_id FOR UPDATE;
  SELECT partner_account_id, montant_fcfa, statut
    INTO settlement_partner, settlement_amount, settlement_status
    FROM commission_settlements WHERE id = NEW.settlement_id FOR UPDATE;
  IF commission_partner IS NULL OR settlement_partner IS NULL OR commission_partner <> settlement_partner THEN
    RAISE EXCEPTION 'Allocation partenaire incohérente';
  END IF;
  IF commission_status <> 'due' OR commission_mode <> 'cash_receivable' OR settlement_status <> 'confirmed' THEN
    RAISE EXCEPTION 'Allocation autorisée uniquement sur une commission cash due et un règlement confirmé';
  END IF;
  SELECT COALESCE(SUM(amount_fcfa), 0) INTO already_on_commission FROM commission_settlement_allocations WHERE commission_id = NEW.commission_id AND id <> NEW.id;
  SELECT COALESCE(SUM(amount_fcfa), 0) INTO already_on_settlement FROM commission_settlement_allocations WHERE settlement_id = NEW.settlement_id AND id <> NEW.id;
  IF already_on_commission + NEW.amount_fcfa > commission_amount OR already_on_settlement + NEW.amount_fcfa > settlement_amount THEN
    RAISE EXCEPTION 'Allocation supérieure au solde disponible';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "public"."enforce_commission_allocation"() FROM PUBLIC;
--> statement-breakpoint
CREATE TRIGGER "commission_allocation_guard" BEFORE INSERT OR UPDATE ON "commission_settlement_allocations" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_commission_allocation"();
