CREATE TYPE "public"."order_channel" AS ENUM('PLATFORM', 'DIRECT_DISPATCH');--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "direct_dispatch_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "channel" "order_channel" DEFAULT 'PLATFORM' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "recipient_phone" varchar(32);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "recipient_name" varchar(255);--> statement-breakpoint
ALTER TABLE "store_settings" ADD COLUMN "direct_dispatch_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "store_settings" ADD COLUMN "direct_dispatch_driver_reserve" integer DEFAULT 2 NOT NULL;