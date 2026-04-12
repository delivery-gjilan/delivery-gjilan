ALTER TABLE "orders" ADD COLUMN "inventory_price" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "inventory_quantity" integer DEFAULT 0 NOT NULL;