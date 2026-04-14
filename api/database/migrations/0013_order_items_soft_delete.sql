ALTER TABLE "order_items" ADD COLUMN "removed_quantity" integer;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "removed_reason" varchar(500);--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "removed_at" timestamp with time zone;