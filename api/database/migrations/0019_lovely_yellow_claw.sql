ALTER TABLE "notification_campaigns" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "notification_campaigns" ADD COLUMN "time_sensitive" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_campaigns" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "notification_campaigns" ADD COLUMN "relevance_score" real;