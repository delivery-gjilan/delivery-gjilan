ALTER TABLE "orders" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
UPDATE "orders" SET "status" = 'PREPARING' WHERE "status" = 'ACCEPTED';--> statement-breakpoint
DROP TYPE "public"."order_status";--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('PENDING', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED');--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" SET DATA TYPE "public"."order_status" USING "status"::"public"."order_status";--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "preparation_minutes" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "estimated_ready_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "preparing_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "ready_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "out_for_delivery_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivered_at" timestamp with time zone;