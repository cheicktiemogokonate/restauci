CREATE TYPE "public"."methode_paiement" AS ENUM('especes', 'carte', 'mobile_money', 'en_ligne');--> statement-breakpoint
CREATE TYPE "public"."plan_abonnement" AS ENUM('gratuit', 'starter', 'pro', 'entreprise');--> statement-breakpoint
CREATE TYPE "public"."statut_abonnement" AS ENUM('essai', 'actif', 'expire', 'suspendu');--> statement-breakpoint
CREATE TYPE "public"."statut_livraison" AS ENUM('en_attente', 'assignee', 'en_route', 'livree', 'echouee');--> statement-breakpoint
CREATE TYPE "public"."statut_paiement" AS ENUM('en_attente', 'paye', 'rembourse', 'echoue');--> statement-breakpoint
CREATE TYPE "public"."type_notification" AS ENUM('nouvelle_commande', 'commande_prete', 'commande_annulee', 'nouveau_avis', 'promotion', 'systeme');--> statement-breakpoint
CREATE TYPE "public"."type_promotion" AS ENUM('pourcentage', 'montant_fixe', 'offre_1_1', 'livraison_gratuite');--> statement-breakpoint
CREATE TABLE "abonnements" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"restaurant_id" varchar(36) NOT NULL,
	"plan" "plan_abonnement" DEFAULT 'gratuit' NOT NULL,
	"statut" "statut_abonnement" DEFAULT 'essai' NOT NULL,
	"date_debut" timestamp with time zone NOT NULL,
	"date_fin" timestamp with time zone,
	"max_plats" integer DEFAULT 20 NOT NULL,
	"max_categories" integer DEFAULT 5 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "abonnements_restaurant_id_unique" UNIQUE("restaurant_id")
);
--> statement-breakpoint
CREATE TABLE "avis" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"commande_id" varchar(36) NOT NULL,
	"restaurant_id" varchar(36) NOT NULL,
	"client_id" varchar(36),
	"note" integer NOT NULL,
	"note_nourriture" integer,
	"note_livraison" integer,
	"note_service" integer,
	"commentaire" text,
	"reponse_restaurant" text,
	"repondu_at" timestamp with time zone,
	"visible" boolean DEFAULT true NOT NULL,
	"signale" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "livraisons" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"commande_id" varchar(36) NOT NULL,
	"livreur_id" varchar(36),
	"statut" "statut_livraison" DEFAULT 'en_attente' NOT NULL,
	"adresse" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"distance_km" real,
	"duree_estimee_min" integer,
	"heure_assignee" timestamp with time zone,
	"heure_depart" timestamp with time zone,
	"heure_livree" timestamp with time zone,
	"note_client" integer,
	"commentaire_client" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "livraisons_commande_id_unique" UNIQUE("commande_id")
);
--> statement-breakpoint
CREATE TABLE "livreurs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"restaurant_id" varchar(36) NOT NULL,
	"nom" varchar(255) NOT NULL,
	"telephone" varchar(20) NOT NULL,
	"vehicule" varchar(50),
	"numero_vehicule" varchar(20),
	"en_ligne" boolean DEFAULT false NOT NULL,
	"actif" boolean DEFAULT true NOT NULL,
	"latitude_actuelle" double precision,
	"longitude_actuelle" double precision,
	"derniere_position" timestamp with time zone,
	"nombre_livraisons" integer DEFAULT 0 NOT NULL,
	"note_moyenne" real DEFAULT 0,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36),
	"client_id" varchar(36),
	"type" "type_notification" NOT NULL,
	"titre" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"lien_type" varchar(50),
	"lien_id" varchar(36),
	"lue" boolean DEFAULT false NOT NULL,
	"lue_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paiements" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"commande_id" varchar(36) NOT NULL,
	"montant" integer NOT NULL,
	"methode" "methode_paiement" NOT NULL,
	"statut" "statut_paiement" DEFAULT 'en_attente' NOT NULL,
	"reference_externe" varchar(255),
	"numero_mobile_money" varchar(20),
	"operateur" varchar(50),
	"paye_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "paiements_commande_id_unique" UNIQUE("commande_id")
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"restaurant_id" varchar(36) NOT NULL,
	"plat_id" varchar(36),
	"categorie_id" varchar(36),
	"nom" varchar(255) NOT NULL,
	"description" text,
	"type" "type_promotion" NOT NULL,
	"valeur" integer DEFAULT 0 NOT NULL,
	"code_promo" varchar(50),
	"montant_min_commande" integer DEFAULT 0,
	"utilisations_max" integer,
	"utilisations_actuelles" integer DEFAULT 0 NOT NULL,
	"date_debut" timestamp with time zone NOT NULL,
	"date_fin" timestamp with time zone,
	"actif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "promotions_code_promo_unique" UNIQUE("code_promo")
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"type" varchar(20) NOT NULL,
	"endpoint" text,
	"p256dh" text,
	"auth" text,
	"expo_token" text,
	"user_agent" text,
	"created_at" timestamp with time zone NOT NULL,
	"last_used_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "visible" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "avatar_url" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "nombre_commandes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "total_depense" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "email_verifie" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "actif" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "commandes" ADD COLUMN "remise" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "commandes" ADD COLUMN "note_interne" text;--> statement-breakpoint
ALTER TABLE "commandes" ADD COLUMN "temps_preparation_estime" integer;--> statement-breakpoint
ALTER TABLE "commandes" ADD COLUMN "heure_acceptee" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "commandes" ADD COLUMN "heure_prete" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "commandes" ADD COLUMN "heure_servie" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "plats" ADD COLUMN "tags" text[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "plats" ADD COLUMN "allergenes" text[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "plats" ADD COLUMN "nutrition" jsonb;--> statement-breakpoint
ALTER TABLE "plats" ADD COLUMN "nombre_commandes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "plats" ADD COLUMN "note_moyenne" real DEFAULT 0;--> statement-breakpoint
ALTER TABLE "plats" ADD COLUMN "nombre_avis" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "email" varchar(255);--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "site_web" text;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "ville" varchar(100);--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "pays" varchar(100) DEFAULT 'Côte d''Ivoire';--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "banniere_url" text;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "commande_minimum" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "cuisines" text[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "en_ligne" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "accepte_commandes" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "temps_preparation_moyen" integer DEFAULT 20;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "facebook" text;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "instagram" text;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "whatsapp" text;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "nombre_commandes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "note_moyenne" real DEFAULT 0;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "nombre_avis" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verifie" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "token_verif_email" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "token_reset_password" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "token_reset_expire_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "dernier_connexion" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "abonnements" ADD CONSTRAINT "abonnements_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avis" ADD CONSTRAINT "avis_commande_id_commandes_id_fk" FOREIGN KEY ("commande_id") REFERENCES "public"."commandes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avis" ADD CONSTRAINT "avis_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avis" ADD CONSTRAINT "avis_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "livraisons" ADD CONSTRAINT "livraisons_commande_id_commandes_id_fk" FOREIGN KEY ("commande_id") REFERENCES "public"."commandes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "livraisons" ADD CONSTRAINT "livraisons_livreur_id_livreurs_id_fk" FOREIGN KEY ("livreur_id") REFERENCES "public"."livreurs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "livreurs" ADD CONSTRAINT "livreurs_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_commande_id_commandes_id_fk" FOREIGN KEY ("commande_id") REFERENCES "public"."commandes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_plat_id_plats_id_fk" FOREIGN KEY ("plat_id") REFERENCES "public"."plats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_categorie_id_categories_id_fk" FOREIGN KEY ("categorie_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_avis_restaurant" ON "avis" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "idx_avis_client" ON "avis" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_avis_commande" ON "avis" USING btree ("commande_id");--> statement-breakpoint
CREATE INDEX "idx_avis_restaurant_visible" ON "avis" USING btree ("restaurant_id","visible");--> statement-breakpoint
CREATE INDEX "idx_avis_created_at" ON "avis" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_livraisons_commande" ON "livraisons" USING btree ("commande_id");--> statement-breakpoint
CREATE INDEX "idx_livraisons_livreur" ON "livraisons" USING btree ("livreur_id");--> statement-breakpoint
CREATE INDEX "idx_livraisons_statut" ON "livraisons" USING btree ("statut");--> statement-breakpoint
CREATE INDEX "idx_livreurs_restaurant" ON "livreurs" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_user" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_client" ON "notifications" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_lue" ON "notifications" USING btree ("lue");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_lue" ON "notifications" USING btree ("user_id","lue");--> statement-breakpoint
CREATE INDEX "idx_notifications_created_at" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_paiements_commande" ON "paiements" USING btree ("commande_id");--> statement-breakpoint
CREATE INDEX "idx_paiements_statut" ON "paiements" USING btree ("statut");--> statement-breakpoint
CREATE INDEX "idx_promotions_restaurant" ON "promotions" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "idx_promotions_code" ON "promotions" USING btree ("code_promo");--> statement-breakpoint
CREATE INDEX "idx_promotions_dates" ON "promotions" USING btree ("date_debut","date_fin");--> statement-breakpoint
CREATE INDEX "idx_promotions_restaurant_actif" ON "promotions" USING btree ("restaurant_id","actif");--> statement-breakpoint
CREATE INDEX "idx_push_subscriptions_user" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_push_subscriptions_type" ON "push_subscriptions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_push_subscriptions_endpoint" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "idx_categories_restaurant_ordre" ON "categories" USING btree ("restaurant_id","ordre");--> statement-breakpoint
CREATE INDEX "idx_categories_restaurant_visible" ON "categories" USING btree ("restaurant_id","visible");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_clients_telephone" ON "clients" USING btree ("telephone");--> statement-breakpoint
CREATE INDEX "idx_clients_email" ON "clients" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_commandes_numero" ON "commandes" USING btree ("numero");--> statement-breakpoint
CREATE INDEX "idx_commandes_restaurant" ON "commandes" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "idx_commandes_client" ON "commandes" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_commandes_statut" ON "commandes" USING btree ("statut");--> statement-breakpoint
CREATE INDEX "idx_commandes_created_at" ON "commandes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_commandes_restaurant_statut" ON "commandes" USING btree ("restaurant_id","statut");--> statement-breakpoint
CREATE INDEX "idx_commandes_restaurant_created_at" ON "commandes" USING btree ("restaurant_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_creneaux_horaires_restaurant" ON "creneaux_horaires" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "idx_creneaux_horaires_restaurant_nom" ON "creneaux_horaires" USING btree ("restaurant_id","nom");--> statement-breakpoint
CREATE INDEX "idx_plats_restaurant_categorie" ON "plats" USING btree ("restaurant_id","categorie_id");--> statement-breakpoint
CREATE INDEX "idx_plats_disponible" ON "plats" USING btree ("disponible");--> statement-breakpoint
CREATE INDEX "idx_plats_restaurant_disponible" ON "plats" USING btree ("restaurant_id","disponible");--> statement-breakpoint
CREATE INDEX "idx_plats_nom" ON "plats" USING btree ("nom");--> statement-breakpoint
CREATE INDEX "idx_plats_restaurant_nom" ON "plats" USING btree ("restaurant_id","nom");--> statement-breakpoint
CREATE INDEX "idx_restaurants_ville" ON "restaurants" USING btree ("ville");--> statement-breakpoint
CREATE INDEX "idx_restaurants_actif" ON "restaurants" USING btree ("actif");--> statement-breakpoint
CREATE INDEX "idx_restaurants_ville_actif" ON "restaurants" USING btree ("ville","actif");--> statement-breakpoint
CREATE INDEX "idx_users_role" ON "users" USING btree ("role");