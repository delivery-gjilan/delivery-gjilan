CREATE TABLE "personal_inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"low_stock_threshold" integer DEFAULT 2,
	"cost_price" numeric(10, 2),
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_coverage_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"ordered_qty" integer NOT NULL,
	"from_stock" integer DEFAULT 0 NOT NULL,
	"from_market" integer DEFAULT 0 NOT NULL,
	"deducted" boolean DEFAULT false NOT NULL,
	"deducted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "store_settings" ADD COLUMN "inventory_mode_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "personal_inventory" ADD CONSTRAINT "personal_inventory_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_inventory" ADD CONSTRAINT "personal_inventory_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_coverage_logs" ADD CONSTRAINT "order_coverage_logs_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_coverage_logs" ADD CONSTRAINT "order_coverage_logs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_personal_inventory_business_product" ON "personal_inventory" USING btree ("business_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_personal_inventory_business_id" ON "personal_inventory" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_order_coverage_order_product" ON "order_coverage_logs" USING btree ("order_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_order_coverage_order_id" ON "order_coverage_logs" USING btree ("order_id");