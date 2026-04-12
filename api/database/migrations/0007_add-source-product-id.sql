ALTER TABLE "orders" ADD COLUMN "driver_tip" numeric(10, 2) DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "source_product_id" uuid;