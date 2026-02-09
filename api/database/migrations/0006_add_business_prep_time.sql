ALTER TABLE "businesses" ADD COLUMN "avg_prep_time_minutes" integer DEFAULT 20 NOT NULL;
ALTER TABLE "businesses" ADD COLUMN "prep_time_override_minutes" integer;
