ALTER TYPE "public"."driver_connection_status" ADD VALUE 'STALE' BEFORE 'DISCONNECTED';--> statement-breakpoint
ALTER TYPE "public"."driver_connection_status" ADD VALUE 'LOST' BEFORE 'DISCONNECTED';--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "last_heartbeat_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "disconnected_at" timestamp with time zone;