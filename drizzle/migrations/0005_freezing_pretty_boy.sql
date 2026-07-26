ALTER TYPE "public"."type_notification" ADD VALUE 'abonnement_expire';--> statement-breakpoint
ALTER TABLE "commandes" ADD COLUMN "idempotency_key" varchar(64);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_commandes_client_idempotency" ON "commandes" USING btree ("client_id","idempotency_key");