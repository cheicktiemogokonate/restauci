CREATE TYPE "public"."transaction_type" AS ENUM('commande_restaurant', 'abonnement_partenaire', 'commission_settlement');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('pending', 'paid', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'confirmed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'mobile_money', 'card', 'bank_transfer', 'cheque', 'manual');--> statement-breakpoint
CREATE TYPE "public"."payment_network" AS ENUM('wave', 'orange', 'mtn');--> statement-breakpoint

CREATE TABLE "transactions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"type" "transaction_type" NOT NULL,
	"status" "transaction_status" DEFAULT 'pending' NOT NULL,
	"partner_account_id" uuid NOT NULL,
	"client_id" varchar(36),
	"amount_fcfa" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'XOF' NOT NULL,
	"restaurant_order_id" varchar(36),
	"subscription_request_id" varchar(36),
	"commission_settlement_id" varchar(36),
	"paid_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "transactions_amount_positive" CHECK ("transactions"."amount_fcfa" > 0),
	CONSTRAINT "transactions_currency_xof" CHECK ("transactions"."currency" = 'XOF'),
	CONSTRAINT "transactions_source_coherent" CHECK (
		("transactions"."type" = 'commande_restaurant' AND "transactions"."restaurant_order_id" IS NOT NULL AND "transactions"."subscription_request_id" IS NULL AND "transactions"."commission_settlement_id" IS NULL)
		OR ("transactions"."type" = 'abonnement_partenaire' AND "transactions"."restaurant_order_id" IS NULL AND "transactions"."subscription_request_id" IS NOT NULL AND "transactions"."commission_settlement_id" IS NULL)
		OR ("transactions"."type" = 'commission_settlement' AND "transactions"."restaurant_order_id" IS NULL AND "transactions"."subscription_request_id" IS NULL AND "transactions"."commission_settlement_id" IS NOT NULL)
	),
	CONSTRAINT "transactions_lifecycle_coherent" CHECK (
		("transactions"."status" = 'pending' AND "transactions"."paid_at" IS NULL AND "transactions"."cancelled_at" IS NULL)
		OR ("transactions"."status" = 'paid' AND "transactions"."paid_at" IS NOT NULL AND "transactions"."cancelled_at" IS NULL)
		OR ("transactions"."status" = 'cancelled' AND "transactions"."paid_at" IS NULL AND "transactions"."cancelled_at" IS NOT NULL)
	)
);--> statement-breakpoint

ALTER TABLE "transactions" ADD CONSTRAINT "transactions_partner_account_id_partner_accounts_id_fk" FOREIGN KEY ("partner_account_id") REFERENCES "public"."partner_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_restaurant_order_id_commandes_id_fk" FOREIGN KEY ("restaurant_order_id") REFERENCES "public"."commandes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_subscription_request_id_subscription_requests_id_fk" FOREIGN KEY ("subscription_request_id") REFERENCES "public"."subscription_requests"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_commission_settlement_id_commission_settlements_id_fk" FOREIGN KEY ("commission_settlement_id") REFERENCES "public"."commission_settlements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "transactions_type_status_idx" ON "transactions" USING btree ("type", "status");--> statement-breakpoint
CREATE INDEX "transactions_partner_status_idx" ON "transactions" USING btree ("partner_account_id", "status");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_restaurant_order_unique" ON "transactions" USING btree ("restaurant_order_id") WHERE "restaurant_order_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_subscription_request_unique" ON "transactions" USING btree ("subscription_request_id") WHERE "subscription_request_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_commission_settlement_unique" ON "transactions" USING btree ("commission_settlement_id") WHERE "commission_settlement_id" IS NOT NULL;--> statement-breakpoint

DROP TABLE "paiements";--> statement-breakpoint
DROP TYPE "public"."statut_paiement";--> statement-breakpoint
DROP TYPE "public"."methode_paiement";--> statement-breakpoint

CREATE TABLE "payments" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"transaction_id" varchar(36) NOT NULL,
	"provider" varchar(50),
	"method" "payment_method" NOT NULL,
	"network" "payment_network",
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"amount_fcfa" integer NOT NULL,
	"provider_reference" varchar(255),
	"idempotency_key" varchar(128),
	"confirmed_by_admin_id" varchar(36),
	"confirmed_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "payments_amount_positive" CHECK ("payments"."amount_fcfa" > 0),
	CONSTRAINT "payments_provider_reference_coherent" CHECK ("payments"."provider_reference" IS NULL OR "payments"."provider" IS NOT NULL),
	CONSTRAINT "payments_cash_provider_coherent" CHECK ("payments"."method" <> 'cash' OR "payments"."provider" IS NULL),
	CONSTRAINT "payments_network_coherent" CHECK ("payments"."network" IS NULL OR "payments"."method" = 'mobile_money'),
	CONSTRAINT "payments_lifecycle_coherent" CHECK (
		("payments"."status" = 'pending' AND "payments"."confirmed_at" IS NULL AND "payments"."failed_at" IS NULL AND "payments"."cancelled_at" IS NULL)
		OR ("payments"."status" = 'confirmed' AND "payments"."confirmed_at" IS NOT NULL AND "payments"."failed_at" IS NULL AND "payments"."cancelled_at" IS NULL)
		OR ("payments"."status" = 'failed' AND "payments"."confirmed_at" IS NULL AND "payments"."failed_at" IS NOT NULL AND "payments"."cancelled_at" IS NULL)
		OR ("payments"."status" = 'cancelled' AND "payments"."confirmed_at" IS NULL AND "payments"."failed_at" IS NULL AND "payments"."cancelled_at" IS NOT NULL)
	)
);--> statement-breakpoint

ALTER TABLE "payments" ADD CONSTRAINT "payments_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_confirmed_by_admin_id_users_id_fk" FOREIGN KEY ("confirmed_by_admin_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payments_transaction_idx" ON "payments" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_provider_reference_unique" ON "payments" USING btree ("provider", "provider_reference") WHERE "provider" IS NOT NULL AND "provider_reference" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "payments_transaction_idempotency_unique" ON "payments" USING btree ("transaction_id", "idempotency_key") WHERE "idempotency_key" IS NOT NULL;--> statement-breakpoint

-- Toutes les commandes historiques du prototype utilisent le workflow cash.
-- Leur état final est la seule source fiable : servie = encaissée, annulée =
-- sans objet, les autres restent en attente. Aucun montant n'est recalculé.
INSERT INTO "transactions" (
	"id", "type", "status", "partner_account_id", "client_id", "amount_fcfa",
	"currency", "restaurant_order_id", "paid_at", "cancelled_at", "created_at", "updated_at"
)
SELECT
	gen_random_uuid()::text,
	'commande_restaurant',
	CASE WHEN c."statut" = 'servie' THEN 'paid'::transaction_status WHEN c."statut" = 'annulee' THEN 'cancelled'::transaction_status ELSE 'pending'::transaction_status END,
	r."partner_account_id",
	c."client_id",
	c."total",
	'XOF',
	c."id",
	CASE WHEN c."statut" = 'servie' THEN COALESCE(c."heure_servie", c."updated_at") ELSE NULL END,
	CASE WHEN c."statut" = 'annulee' THEN c."updated_at" ELSE NULL END,
	c."created_at",
	c."updated_at"
FROM "commandes" c
INNER JOIN "restaurants" r ON r."id" = c."restaurant_id"
WHERE c."total" > 0;--> statement-breakpoint

INSERT INTO "payments" (
	"id", "transaction_id", "provider", "method", "status", "amount_fcfa",
	"idempotency_key", "confirmed_at", "cancelled_at", "created_at", "updated_at"
)
SELECT
	gen_random_uuid()::text,
	t."id",
	NULL,
	'cash',
	CASE WHEN t."status" = 'paid' THEN 'confirmed'::payment_status WHEN t."status" = 'cancelled' THEN 'cancelled'::payment_status ELSE 'pending'::payment_status END,
	t."amount_fcfa",
	'commande-cash:' || t."restaurant_order_id",
	t."paid_at",
	t."cancelled_at",
	t."created_at",
	t."updated_at"
FROM "transactions" t
WHERE t."type" = 'commande_restaurant';--> statement-breakpoint

-- Les demandes payantes encore ouvertes doivent pouvoir poursuivre le nouveau
-- workflow. Découverte (0 FCFA) ne crée aucune obligation financière.
INSERT INTO "transactions" (
	"id", "type", "status", "partner_account_id", "amount_fcfa", "currency",
	"subscription_request_id", "created_at", "updated_at"
)
SELECT
	gen_random_uuid()::text,
	'abonnement_partenaire',
	'pending',
	sr."partner_account_id",
	sr."prix_fige_fcfa",
	'XOF',
	sr."id",
	sr."created_at",
	sr."created_at"
FROM "subscription_requests" sr
WHERE sr."statut" = 'en_attente' AND sr."prix_fige_fcfa" > 0;--> statement-breakpoint

ALTER TABLE "commission_settlements" DROP CONSTRAINT "commission_settlements_manual_admin_coherent";--> statement-breakpoint
ALTER TABLE "commission_settlements" ADD CONSTRAINT "commission_settlements_manual_admin_coherent" CHECK (
	"commission_settlements"."source" <> 'manual_admin'
	OR (
		"commission_settlements"."admin_id" IS NOT NULL
		AND "commission_settlements"."moyen_reglement" IS NOT NULL
		AND (
			("commission_settlements"."statut" = 'pending' AND "commission_settlements"."confirmed_at" IS NULL)
			OR ("commission_settlements"."statut" = 'confirmed' AND "commission_settlements"."confirmed_at" IS NOT NULL)
		)
	)
);
