ALTER TABLE "store_settings" ADD COLUMN "early_dispatch_lead_minutes" integer DEFAULT 5 NOT NULL;
ALTER TABLE "store_settings" ADD COLUMN "business_grace_period_minutes" integer DEFAULT 0 NOT NULL;
