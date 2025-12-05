CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(1000),
	"image_url" varchar(500),
	"price" numeric(10, 2) NOT NULL,
	"is_on_sale" boolean DEFAULT false,
	"sale_price" numeric(10, 2),
	"is_available" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"is_on_sale" boolean DEFAULT false,
	"sale_price" numeric(10, 2),
	"is_available" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;