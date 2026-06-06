CREATE TYPE "public"."mode_commande" AS ENUM('sur_place', 'livraison', 'emporter');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('restaurateur', 'admin');--> statement-breakpoint
CREATE TYPE "public"."statut_commande" AS ENUM('recue', 'en_preparation', 'prete', 'servie', 'annulee');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"restaurant_id" varchar(36) NOT NULL,
	"creneau_id" varchar(36),
	"nom" varchar(255) NOT NULL,
	"ordre" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"nom" varchar(255) NOT NULL,
	"telephone" varchar(20) NOT NULL,
	"email" varchar(255),
	"password" text,
	"latitude_defaut" double precision,
	"longitude_defaut" double precision,
	"adresse_defaut" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "clients_telephone_unique" UNIQUE("telephone"),
	CONSTRAINT "clients_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "commandes" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"numero" varchar(20) NOT NULL,
	"restaurant_id" varchar(36) NOT NULL,
	"client_id" varchar(36),
	"mode_commande" "mode_commande" NOT NULL,
	"statut" "statut_commande" DEFAULT 'recue' NOT NULL,
	"numero_table" varchar(10),
	"nom_client" varchar(255) NOT NULL,
	"telephone_client" varchar(20),
	"adresse_livraison" text,
	"latitude_livraison" double precision,
	"longitude_livraison" double precision,
	"distance_km" real,
	"items" jsonb NOT NULL,
	"sous_total" integer NOT NULL,
	"frais_livraison" integer DEFAULT 0 NOT NULL,
	"total" integer NOT NULL,
	"note_client" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "commandes_numero_unique" UNIQUE("numero")
);
--> statement-breakpoint
CREATE TABLE "creneaux_horaires" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"restaurant_id" varchar(36) NOT NULL,
	"nom" varchar(255) NOT NULL,
	"heure_ouverture" time(0) NOT NULL,
	"heure_fermeture" time(0) NOT NULL,
	"jours_actifs" text[] NOT NULL,
	"actif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plats" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"restaurant_id" varchar(36) NOT NULL,
	"categorie_id" varchar(36) NOT NULL,
	"creneau_id" varchar(36),
	"nom" varchar(255) NOT NULL,
	"description" text,
	"prix" integer NOT NULL,
	"photo_url" text,
	"disponible" boolean DEFAULT true NOT NULL,
	"ordre" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restaurants" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"nom" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"telephone" varchar(20) NOT NULL,
	"adresse" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"logo_url" text,
	"frais_livraison" integer DEFAULT 0 NOT NULL,
	"modes_commande" text[] DEFAULT '{"sur_place"}' NOT NULL,
	"actif" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "restaurants_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "restaurants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" text NOT NULL,
	"role" "role" DEFAULT 'restaurateur' NOT NULL,
	"nom" varchar(255) NOT NULL,
	"telephone" varchar(20) NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_creneau_id_creneaux_horaires_id_fk" FOREIGN KEY ("creneau_id") REFERENCES "public"."creneaux_horaires"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commandes" ADD CONSTRAINT "commandes_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commandes" ADD CONSTRAINT "commandes_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creneaux_horaires" ADD CONSTRAINT "creneaux_horaires_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plats" ADD CONSTRAINT "plats_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plats" ADD CONSTRAINT "plats_categorie_id_categories_id_fk" FOREIGN KEY ("categorie_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plats" ADD CONSTRAINT "plats_creneau_id_creneaux_horaires_id_fk" FOREIGN KEY ("creneau_id") REFERENCES "public"."creneaux_horaires"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_restaurants_slug" ON "restaurants" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_restaurants_user_id" ON "restaurants" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_email" ON "users" USING btree ("email");