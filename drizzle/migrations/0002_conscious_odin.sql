CREATE TYPE "public"."audit_action" AS ENUM('restaurant_valide', 'restaurant_rejete', 'restaurant_suspendu', 'restaurant_reactive', 'user_suspendu', 'user_reactive', 'client_suspendu', 'client_reactive', 'commission_modifiee');--> statement-breakpoint
CREATE TYPE "public"."statut_commission" AS ENUM('en_attente', 'payee', 'annulee');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"admin_id" varchar(36) NOT NULL,
	"action" "audit_action" NOT NULL,
	"ressource_type" varchar(50) NOT NULL,
	"ressource_id" varchar(36) NOT NULL,
	"details" jsonb,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commissions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"commande_id" varchar(36) NOT NULL,
	"restaurant_id" varchar(36) NOT NULL,
	"montant_commande" integer NOT NULL,
	"taux_commission_bps" integer NOT NULL,
	"montant_commission" integer NOT NULL,
	"statut" "statut_commission" DEFAULT 'en_attente' NOT NULL,
	"payee_at" timestamp with time zone,
	"payee_par_user_id" varchar(36),
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "commissions_commande_id_unique" UNIQUE("commande_id")
);
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "motif_suspension" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "suspendu_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "motif_rejet" text;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "valide_par_user_id" varchar(36);--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "valide_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "suspendu" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "motif_suspension" text;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "taux_commission_bps" integer DEFAULT 1000 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "suspendu" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "motif_suspension" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "suspendu_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_commande_id_commandes_id_fk" FOREIGN KEY ("commande_id") REFERENCES "public"."commandes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_payee_par_user_id_users_id_fk" FOREIGN KEY ("payee_par_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_log_admin" ON "audit_log" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "idx_audit_log_ressource" ON "audit_log" USING btree ("ressource_type","ressource_id");--> statement-breakpoint
CREATE INDEX "idx_audit_log_created_at" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_commissions_restaurant" ON "commissions" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "idx_commissions_statut" ON "commissions" USING btree ("statut");--> statement-breakpoint
CREATE INDEX "idx_commissions_restaurant_statut" ON "commissions" USING btree ("restaurant_id","statut");--> statement-breakpoint
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_valide_par_user_id_users_id_fk" FOREIGN KEY ("valide_par_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;