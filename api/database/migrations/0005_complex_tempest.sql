ALTER TYPE "public"."order_status" ADD VALUE 'READY' BEFORE 'OUT_FOR_DELIVERY';--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "avg_prep_time_minutes" integer DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "prep_time_override_minutes" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "driver_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "driver_lat" double precision;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "driver_lng" double precision;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "driver_location_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;