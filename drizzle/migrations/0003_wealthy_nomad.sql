CREATE TYPE "public"."moyen_reglement" AS ENUM('mobile_money', 'virement', 'especes', 'cheque');--> statement-breakpoint
CREATE TYPE "public"."plan_code" AS ENUM('decouverte', 'croissance', 'partenaire_fier');--> statement-breakpoint
CREATE TYPE "public"."statut_demande_abonnement" AS ENUM('en_attente', 'validee', 'refusee', 'annulee');--> statement-breakpoint
CREATE TYPE "public"."statut_periode_abonnement" AS ENUM('active', 'expiree', 'suspendue', 'annulee');--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'abonnement_valide';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'abonnement_refuse';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'abonnement_suspendu';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'abonnement_reactive';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'abonnement_expire';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'abonnement_regrade';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'catalogue_modifie';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'commissions_encaissees';--> statement-breakpoint
ALTER TYPE "public"."type_notification" ADD VALUE 'abonnement_valide';--> statement-breakpoint
ALTER TYPE "public"."type_notification" ADD VALUE 'abonnement_refuse';--> statement-breakpoint
ALTER TYPE "public"."type_notification" ADD VALUE 'echeance_proche';--> statement-breakpoint
ALTER TYPE "public"."type_notification" ADD VALUE 'abonnement_regrade';--> statement-breakpoint
ALTER TYPE "public"."type_notification" ADD VALUE 'abonnement_suspendu';--> statement-breakpoint
ALTER TYPE "public"."type_notification" ADD VALUE 'abonnement_expire';--> statement-breakpoint
CREATE TABLE "commission_settlements" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"restaurant_id" varchar(36) NOT NULL,
	"admin_id" varchar(36) NOT NULL,
	"montant_total" integer NOT NULL,
	"nombre_commissions" integer NOT NULL,
	"reference_reglement" varchar(255),
	"notes" text,
	"settled_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_periods" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"restaurant_id" varchar(36) NOT NULL,
	"request_id" varchar(36),
	"plan_code" "plan_code" NOT NULL,
	"taux_commission_bps_fige" integer NOT NULL,
	"prix_paye_fcfa" integer DEFAULT 0 NOT NULL,
	"moyen_reglement" "moyen_reglement",
	"reference_reglement" varchar(255),
	"date_reglement" timestamp with time zone,
	"validee_par_admin_id" varchar(36),
	"date_debut" timestamp with time zone NOT NULL,
	"date_echeance" timestamp with time zone,
	"statut" "statut_periode_abonnement" DEFAULT 'active' NOT NULL,
	"motif_suspension" text,
	"suspendu_par_admin_id" varchar(36),
	"suspendu_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"code" "plan_code" NOT NULL,
	"nom" varchar(100) NOT NULL,
	"description" text,
	"prix_annuel_fcfa" integer DEFAULT 0 NOT NULL,
	"taux_commission_bps" integer NOT NULL,
	"max_plats" integer,
	"max_categories" integer,
	"ordre" integer DEFAULT 0 NOT NULL,
	"actif" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"updated_by_admin_id" varchar(36),
	CONSTRAINT "subscription_plans_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "subscription_requests" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"restaurant_id" varchar(36) NOT NULL,
	"plan_code" "plan_code" NOT NULL,
	"prix_fige_fcfa" integer DEFAULT 0 NOT NULL,
	"statut" "statut_demande_abonnement" DEFAULT 'en_attente' NOT NULL,
	"motif_refus" text,
	"traitee_par_admin_id" varchar(36),
	"traitee_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "commissions" ADD COLUMN "settlement_id" varchar(36);--> statement-breakpoint
ALTER TABLE "commission_settlements" ADD CONSTRAINT "commission_settlements_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_settlements" ADD CONSTRAINT "commission_settlements_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_periods" ADD CONSTRAINT "subscription_periods_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_periods" ADD CONSTRAINT "subscription_periods_request_id_subscription_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."subscription_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_periods" ADD CONSTRAINT "subscription_periods_validee_par_admin_id_users_id_fk" FOREIGN KEY ("validee_par_admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_periods" ADD CONSTRAINT "subscription_periods_suspendu_par_admin_id_users_id_fk" FOREIGN KEY ("suspendu_par_admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_updated_by_admin_id_users_id_fk" FOREIGN KEY ("updated_by_admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_requests" ADD CONSTRAINT "subscription_requests_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_requests" ADD CONSTRAINT "subscription_requests_traitee_par_admin_id_users_id_fk" FOREIGN KEY ("traitee_par_admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_settlements_restaurant" ON "commission_settlements" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "idx_settlements_settled_at" ON "commission_settlements" USING btree ("settled_at");--> statement-breakpoint
CREATE INDEX "idx_sub_periods_restaurant" ON "subscription_periods" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "idx_sub_periods_statut" ON "subscription_periods" USING btree ("statut");--> statement-breakpoint
CREATE INDEX "idx_sub_periods_restaurant_statut" ON "subscription_periods" USING btree ("restaurant_id","statut");--> statement-breakpoint
CREATE INDEX "idx_sub_periods_echeance" ON "subscription_periods" USING btree ("date_echeance");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_subscription_plans_code" ON "subscription_plans" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_subscription_plans_ordre" ON "subscription_plans" USING btree ("ordre");--> statement-breakpoint
CREATE INDEX "idx_sub_requests_restaurant" ON "subscription_requests" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "idx_sub_requests_statut" ON "subscription_requests" USING btree ("statut");--> statement-breakpoint
CREATE INDEX "idx_sub_requests_restaurant_statut" ON "subscription_requests" USING btree ("restaurant_id","statut");--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_settlement_id_commission_settlements_id_fk" FOREIGN KEY ("settlement_id") REFERENCES "public"."commission_settlements"("id") ON DELETE set null ON UPDATE no action;
