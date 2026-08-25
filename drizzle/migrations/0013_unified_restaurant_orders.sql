ALTER TABLE "commandes" ADD COLUMN "idempotency_request_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "subscription_period_limits" DROP CONSTRAINT "subscription_period_limits_subscription_period_id_subscription_periods_id_fk";--> statement-breakpoint
ALTER TABLE "subscription_period_limits" ADD CONSTRAINT "subscription_period_limits_subscription_period_id_subscription_periods_id_fk" FOREIGN KEY ("subscription_period_id") REFERENCES "public"."subscription_periods"("id") ON DELETE restrict ON UPDATE no action;
