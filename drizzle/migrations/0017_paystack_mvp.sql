ALTER TYPE "public"."statut_commande" ADD VALUE IF NOT EXISTS 'en_attente_paiement' BEFORE 'recue';--> statement-breakpoint
ALTER TYPE "public"."commission_settlement_source" ADD VALUE IF NOT EXISTS 'paystack_direct';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'provider_account_associe';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'provider_account_desactive';--> statement-breakpoint
ALTER TYPE "public"."moyen_reglement" ADD VALUE IF NOT EXISTS 'carte' AFTER 'mobile_money';--> statement-breakpoint

CREATE TYPE "public"."payment_provider_account_status" AS ENUM ('active', 'disabled');--> statement-breakpoint
CREATE TABLE "payment_provider_accounts" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "partner_account_id" uuid NOT NULL,
  "provider" varchar(50) NOT NULL,
  "provider_account_reference" varchar(255) NOT NULL,
  "status" "payment_provider_account_status" DEFAULT 'active' NOT NULL,
  "verified_at" timestamp with time zone NOT NULL,
  "linked_by_admin_id" varchar(36) NOT NULL,
  "disabled_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone NOT NULL,
  CONSTRAINT "payment_provider_accounts_paystack_only" CHECK ("payment_provider_accounts"."provider" = 'paystack'),
  CONSTRAINT "payment_provider_accounts_lifecycle_coherent" CHECK (("payment_provider_accounts"."status" = 'active' AND "payment_provider_accounts"."disabled_at" IS NULL) OR ("payment_provider_accounts"."status" = 'disabled' AND "payment_provider_accounts"."disabled_at" IS NOT NULL))
);--> statement-breakpoint
ALTER TABLE "payment_provider_accounts" ADD CONSTRAINT "payment_provider_accounts_partner_account_id_partner_accounts_id_fk" FOREIGN KEY ("partner_account_id") REFERENCES "public"."partner_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_provider_accounts" ADD CONSTRAINT "payment_provider_accounts_linked_by_admin_id_users_id_fk" FOREIGN KEY ("linked_by_admin_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_provider_accounts_partner_provider_unique" ON "payment_provider_accounts" USING btree ("partner_account_id", "provider");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_provider_accounts_provider_reference_unique" ON "payment_provider_accounts" USING btree ("provider", "provider_account_reference");--> statement-breakpoint
CREATE INDEX "payment_provider_accounts_active_lookup_idx" ON "payment_provider_accounts" USING btree ("partner_account_id", "provider", "status");--> statement-breakpoint

ALTER TABLE "commission_settlements" ALTER COLUMN "paid_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "checkout_url" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "recovery_settlement_id" varchar(36);--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_recovery_settlement_id_commission_settlements_id_fk" FOREIGN KEY ("recovery_settlement_id") REFERENCES "public"."commission_settlements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payments_recovery_settlement_unique" ON "payments" USING btree ("recovery_settlement_id") WHERE "recovery_settlement_id" IS NOT NULL;
