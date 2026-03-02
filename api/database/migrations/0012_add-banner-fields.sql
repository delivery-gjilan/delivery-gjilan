ALTER TABLE "store_settings" ADD COLUMN "banner_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "store_settings" ADD COLUMN "banner_message" text;--> statement-breakpoint
ALTER TABLE "store_settings" ADD COLUMN "banner_type" text DEFAULT 'info' NOT NULL;