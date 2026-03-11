CREATE TYPE "public"."settlement_direction" AS ENUM('RECEIVABLE', 'PAYABLE');--> statement-breakpoint
CREATE TYPE "public"."settlement_rule_type" AS ENUM('PERCENTAGE', 'FIXED_PER_ORDER', 'PRODUCT_MARKUP', 'DRIVER_VEHICLE_BONUS', 'CUSTOM');--> statement-breakpoint
CREATE TYPE "public"."settlement_entity_type" AS ENUM('DRIVER', 'BUSINESS');--> statement-breakpoint
CREATE TYPE "public"."pricing_condition_type" AS ENUM('TIME_OF_DAY', 'DAY_OF_WEEK', 'WEATHER', 'DEMAND', 'SPECIAL_EVENT', 'CUSTOM');--> statement-breakpoint
ALTER TYPE "public"."settlement_status" ADD VALUE 'DISPUTED';--> statement-breakpoint
ALTER TYPE "public"."settlement_status" ADD VALUE 'CANCELLED';--> statement-breakpoint
CREATE TABLE "settlement_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" "settlement_entity_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	"rule_type" "settlement_rule_type" NOT NULL,
	"config" jsonb NOT NULL,
	"can_stack_with" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"activated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"activated_by" uuid,
	"notes" varchar(500),
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dynamic_pricing_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid,
	"name" varchar(255) NOT NULL,
	"description" varchar(500),
	"condition_type" "pricing_condition_type" NOT NULL,
	"condition_config" jsonb NOT NULL,
	"adjustment_config" jsonb NOT NULL,
	"applies_to" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"valid_from" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_pricing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"business_price" numeric(10, 2) NOT NULL,
	"platform_markup" numeric(10, 2) DEFAULT '0' NOT NULL,
	"base_customer_price" numeric(10, 2) NOT NULL,
	"price_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "product_pricing_product_id_unique" UNIQUE("product_id")
);
--> statement-breakpoint
CREATE TABLE "live_activity_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"activity_id" text NOT NULL,
	"push_token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "live_activity_tokens_activity_id_unique" UNIQUE("activity_id"),
	CONSTRAINT "live_activity_tokens_push_token_unique" UNIQUE("push_token")
);
--> statement-breakpoint
ALTER TABLE "settlements" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."settlement_type";--> statement-breakpoint
CREATE TYPE "public"."settlement_type" AS ENUM('DRIVER', 'BUSINESS');--> statement-breakpoint
ALTER TABLE "settlements" ALTER COLUMN "type" SET DATA TYPE "public"."settlement_type" USING "type"::"public"."settlement_type";--> statement-breakpoint
DROP INDEX IF EXISTS "device_tokens_user_device_idx";--> statement-breakpoint
ALTER TABLE "settlements" ADD COLUMN "direction" "settlement_direction" DEFAULT 'RECEIVABLE' NOT NULL;--> statement-breakpoint
ALTER TABLE "settlements" ADD COLUMN "rule_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "settlements" ADD COLUMN "calculation_details" jsonb;--> statement-breakpoint
ALTER TABLE "settlements" ADD COLUMN "currency" varchar(3) DEFAULT 'EUR' NOT NULL;--> statement-breakpoint
ALTER TABLE "settlements" ADD COLUMN "paid_by" uuid;--> statement-breakpoint
ALTER TABLE "settlements" ADD COLUMN "payment_reference" varchar(100);--> statement-breakpoint
ALTER TABLE "settlements" ADD COLUMN "payment_method" varchar(50);--> statement-breakpoint
ALTER TABLE "settlements" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "settlements" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "dynamic_pricing_rules" ADD CONSTRAINT "dynamic_pricing_rules_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_pricing" ADD CONSTRAINT "product_pricing_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_pricing" ADD CONSTRAINT "product_pricing_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_activity_tokens" ADD CONSTRAINT "live_activity_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_activity_tokens" ADD CONSTRAINT "live_activity_tokens_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_paid_by_users_id_fk" FOREIGN KEY ("paid_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_settlements_type_direction" ON "settlements" USING btree ("type","direction");