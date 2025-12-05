CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "address" text NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;