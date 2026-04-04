ALTER TABLE "businesses" ADD COLUMN "is_featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "featured_sort_order" integer DEFAULT 0 NOT NULL;