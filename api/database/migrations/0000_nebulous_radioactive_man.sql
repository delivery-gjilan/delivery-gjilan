CREATE TYPE "public"."action_type" AS ENUM('USER_CREATED', 'USER_UPDATED', 'USER_DELETED', 'USER_ROLE_CHANGED', 'BUSINESS_CREATED', 'BUSINESS_UPDATED', 'BUSINESS_DELETED', 'BUSINESS_APPROVED', 'BUSINESS_REJECTED', 'PRODUCT_CREATED', 'PRODUCT_UPDATED', 'PRODUCT_DELETED', 'PRODUCT_PUBLISHED', 'PRODUCT_UNPUBLISHED', 'PRODUCT_AVAILABILITY_CHANGED', 'PRODUCT_PRICE_CHANGED', 'ORDER_CREATED', 'ORDER_UPDATED', 'ORDER_STATUS_CHANGED', 'ORDER_CANCELLED', 'ORDER_ASSIGNED', 'ORDER_DELIVERED', 'SETTLEMENT_CREATED', 'SETTLEMENT_PAID', 'SETTLEMENT_PARTIAL_PAID', 'SETTLEMENT_UNSETTLED', 'DRIVER_CREATED', 'DRIVER_UPDATED', 'DRIVER_APPROVED', 'DRIVER_REJECTED', 'DRIVER_STATUS_CHANGED', 'USER_LOGIN', 'USER_LOGOUT', 'PASSWORD_CHANGED', 'PASSWORD_RESET', 'CATEGORY_CREATED', 'CATEGORY_UPDATED', 'CATEGORY_DELETED', 'SUBCATEGORY_CREATED', 'SUBCATEGORY_UPDATED', 'SUBCATEGORY_DELETED');--> statement-breakpoint
CREATE TYPE "public"."actor_type" AS ENUM('ADMIN', 'BUSINESS', 'DRIVER', 'CUSTOMER', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."entity_type" AS ENUM('USER', 'BUSINESS', 'PRODUCT', 'ORDER', 'SETTLEMENT', 'DRIVER', 'CATEGORY', 'SUBCATEGORY', 'DELIVERY_ZONE');--> statement-breakpoint
CREATE TYPE "public"."business_type" AS ENUM('MARKET', 'PHARMACY', 'RESTAURANT');--> statement-breakpoint
CREATE TYPE "public"."device_app_type" AS ENUM('CUSTOMER', 'DRIVER', 'BUSINESS', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."device_platform" AS ENUM('IOS', 'ANDROID');--> statement-breakpoint
CREATE TYPE "public"."driver_connection_status" AS ENUM('CONNECTED', 'STALE', 'LOST', 'DISCONNECTED');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('PENDING', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."signup_step" AS ENUM('INITIAL', 'EMAIL_SENT', 'EMAIL_VERIFIED', 'PHONE_SENT', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('CUSTOMER', 'DRIVER', 'SUPER_ADMIN', 'ADMIN', 'BUSINESS_OWNER', 'BUSINESS_EMPLOYEE');--> statement-breakpoint
CREATE TYPE "public"."user_permission" AS ENUM('view_orders', 'manage_orders', 'view_products', 'manage_products', 'view_finances', 'manage_settings', 'view_analytics');--> statement-breakpoint
CREATE TYPE "public"."settlement_direction" AS ENUM('RECEIVABLE', 'PAYABLE');--> statement-breakpoint
CREATE TYPE "public"."settlement_status" AS ENUM('PENDING', 'PAID', 'OVERDUE', 'DISPUTED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."settlement_type" AS ENUM('DRIVER', 'BUSINESS');--> statement-breakpoint
CREATE TYPE "public"."settlement_rule_type" AS ENUM('PERCENTAGE', 'FIXED_PER_ORDER', 'PRODUCT_MARKUP', 'DRIVER_VEHICLE_BONUS', 'CUSTOM');--> statement-breakpoint
CREATE TYPE "public"."settlement_entity_type" AS ENUM('DRIVER', 'BUSINESS');--> statement-breakpoint
CREATE TYPE "public"."pricing_condition_type" AS ENUM('TIME_OF_DAY', 'DAY_OF_WEEK', 'WEATHER', 'DEMAND', 'SPECIAL_EVENT', 'CUSTOM');--> statement-breakpoint
CREATE TYPE "public"."promotion_target" AS ENUM('ALL_USERS', 'SPECIFIC_USERS', 'FIRST_ORDER', 'CONDITIONAL');--> statement-breakpoint
CREATE TYPE "public"."promotion_type" AS ENUM('FIXED_AMOUNT', 'PERCENTAGE', 'FREE_DELIVERY', 'WALLET_CREDIT');--> statement-breakpoint
CREATE TYPE "public"."wallet_transaction_type" AS ENUM('CREDIT', 'DEBIT', 'REFUND', 'REFERRAL_REWARD', 'ADMIN_ADJUSTMENT', 'PROMOTION', 'EXPIRATION');--> statement-breakpoint
CREATE TYPE "public"."promotion_applies_to" AS ENUM('PRICE', 'DELIVERY');--> statement-breakpoint
CREATE TYPE "public"."referral_status" AS ENUM('PENDING', 'COMPLETED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('DRAFT', 'SENDING', 'SENT', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('ORDER_STATUS', 'ORDER_ASSIGNED', 'PROMOTIONAL', 'ADMIN_ALERT');--> statement-breakpoint
CREATE TYPE "public"."push_telemetry_event_type" AS ENUM('RECEIVED', 'OPENED', 'ACTION_TAPPED', 'TOKEN_REGISTERED', 'TOKEN_REFRESHED', 'TOKEN_UNREGISTERED');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"actor_type" "actor_type" NOT NULL,
	"action" "action_type" NOT NULL,
	"entity_type" "entity_type" NOT NULL,
	"entity_id" uuid,
	"metadata" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "banners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text,
	"subtitle" text,
	"image_url" text NOT NULL,
	"link_type" text,
	"link_target" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(500),
	"phone_number" varchar(32),
	"image_url" varchar(500),
	"business_type" "business_type" NOT NULL,
	"is_active" boolean DEFAULT true,
	"location_lat" double precision NOT NULL,
	"location_lng" double precision NOT NULL,
	"location_address" varchar(500) NOT NULL,
	"opens_at" integer NOT NULL,
	"closes_at" integer NOT NULL,
	"avg_prep_time_minutes" integer DEFAULT 20 NOT NULL,
	"prep_time_override_minutes" integer,
	"commission_percentage" numeric(5, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "business_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"opens_at" integer NOT NULL,
	"closes_at" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "uq_business_day_open" UNIQUE("business_id","day_of_week","opens_at")
);
--> statement-breakpoint
CREATE TABLE "delivery_pricing_tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"min_distance_km" numeric(6, 2) NOT NULL,
	"max_distance_km" numeric(6, 2),
	"price" numeric(10, 2) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"polygon" jsonb NOT NULL,
	"delivery_fee" numeric(10, 2) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"platform" "device_platform" NOT NULL,
	"device_id" text NOT NULL,
	"app_type" "device_app_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drivers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"driver_lat" double precision,
	"driver_lng" double precision,
	"last_heartbeat_at" timestamp with time zone,
	"last_location_update" timestamp with time zone,
	"disconnected_at" timestamp with time zone,
	"online_preference" boolean DEFAULT false NOT NULL,
	"connection_status" "driver_connection_status" DEFAULT 'DISCONNECTED' NOT NULL,
	"battery_level" integer,
	"battery_opt_in" boolean DEFAULT false NOT NULL,
	"battery_updated_at" timestamp with time zone,
	"is_charging" boolean,
	"commission_percentage" numeric(5, 2) DEFAULT '0' NOT NULL,
	"max_active_orders" numeric(3, 0) DEFAULT '2' NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "drivers_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_id" varchar(10) NOT NULL,
	"user_id" uuid NOT NULL,
	"driver_id" uuid,
	"price" numeric(10, 2) NOT NULL,
	"delivery_price" numeric(10, 2) NOT NULL,
	"original_price" numeric(10, 2),
	"original_delivery_price" numeric(10, 2),
	"status" "order_status" NOT NULL,
	"dropoff_lat" double precision NOT NULL,
	"dropoff_lng" double precision NOT NULL,
	"dropoff_address" varchar(500) NOT NULL,
	"driver_notes" varchar(500),
	"preparation_minutes" integer,
	"estimated_ready_at" timestamp with time zone,
	"preparing_at" timestamp with time zone,
	"ready_at" timestamp with time zone,
	"out_for_delivery_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"order_date" timestamp DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"quantity" integer NOT NULL,
	"notes" varchar(500),
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "order_items_order_id_product_id_pk" PRIMARY KEY("order_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"subcategory_id" uuid,
	"group_id" uuid,
	"name" varchar(255) NOT NULL,
	"description" varchar(1000),
	"image_url" varchar(500),
	"price" numeric(10, 2) NOT NULL,
	"is_on_sale" boolean DEFAULT false,
	"sale_price" numeric(10, 2),
	"is_available" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_subcategories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"address" text,
	"phone_number" text,
	"email_verified" boolean DEFAULT false NOT NULL,
	"phone_verified" boolean DEFAULT false NOT NULL,
	"signup_step" "signup_step" DEFAULT 'INITIAL' NOT NULL,
	"role" "user_role" DEFAULT 'CUSTOMER' NOT NULL,
	"preferred_language" text DEFAULT 'en' NOT NULL,
	"business_id" uuid,
	"email_verification_code" text,
	"phone_verification_code" text,
	"admin_note" text,
	"flag_color" text DEFAULT 'yellow',
	"image_url" text,
	"referral_code" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "user_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"permission" "user_permission" NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "settlement_type" NOT NULL,
	"direction" "settlement_direction" NOT NULL,
	"driver_id" uuid,
	"business_id" uuid,
	"order_id" uuid NOT NULL,
	"rule_snapshot" jsonb,
	"calculation_details" jsonb,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'EUR' NOT NULL,
	"status" "settlement_status" DEFAULT 'PENDING' NOT NULL,
	"paid_at" timestamp with time zone,
	"paid_by" uuid,
	"payment_reference" varchar(100),
	"payment_method" varchar(50),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
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
CREATE TABLE "user_behaviors" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"total_orders" integer DEFAULT 0 NOT NULL,
	"delivered_orders" integer DEFAULT 0 NOT NULL,
	"cancelled_orders" integer DEFAULT 0 NOT NULL,
	"total_spend" numeric(10, 2) DEFAULT 0 NOT NULL,
	"avg_order_value" numeric(10, 2) DEFAULT 0 NOT NULL,
	"first_order_at" timestamp with time zone,
	"last_order_at" timestamp with time zone,
	"last_delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotion_business_eligibility" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"promotion_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotion_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"promotion_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"discount_amount" numeric(10, 2) NOT NULL,
	"free_delivery_applied" boolean DEFAULT false NOT NULL,
	"order_subtotal" numeric(10, 2) NOT NULL,
	"business_id" uuid,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text,
	"name" text NOT NULL,
	"description" text,
	"type" "promotion_type" NOT NULL,
	"target" "promotion_target" NOT NULL,
	"discount_value" numeric(10, 2),
	"max_discount_cap" numeric(10, 2),
	"min_order_amount" numeric(10, 2),
	"spend_threshold" numeric(10, 2),
	"threshold_reward" jsonb,
	"max_global_usage" integer,
	"max_usage_per_user" integer,
	"current_global_usage" integer DEFAULT 0 NOT NULL,
	"is_stackable" boolean DEFAULT false NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"total_revenue" numeric(12, 2) DEFAULT 0,
	"total_usage_count" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "promotions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "user_promo_metadata" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"has_used_first_order_promo" boolean DEFAULT false NOT NULL,
	"first_order_promo_used_at" timestamp with time zone,
	"total_promotions_used" integer DEFAULT 0 NOT NULL,
	"total_savings" numeric(10, 2) DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "user_promo_metadata_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_promotions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"promotion_id" uuid NOT NULL,
	"assigned_by" uuid,
	"assigned_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"expires_at" timestamp with time zone,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"last_used_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_wallet" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"balance" numeric(10, 2) DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "user_wallet_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "wallet_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "wallet_transaction_type" NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"balance_before" numeric(10, 2) NOT NULL,
	"balance_after" numeric(10, 2) NOT NULL,
	"order_id" uuid,
	"promotion_id" uuid,
	"description" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_promotions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"promotion_id" uuid NOT NULL,
	"applies_to" "promotion_applies_to" NOT NULL,
	"discount_amount" numeric(10, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_address" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"address_name" text,
	"display_name" text,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"is_store_closed" boolean DEFAULT false NOT NULL,
	"closed_message" text DEFAULT 'We are too busy at the moment. Please come back later!',
	"banner_enabled" boolean DEFAULT false NOT NULL,
	"banner_message" text,
	"banner_type" text DEFAULT 'info' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referrer_user_id" uuid NOT NULL,
	"referred_user_id" uuid,
	"referral_code" text NOT NULL,
	"status" "referral_status" DEFAULT 'PENDING' NOT NULL,
	"reward_given" boolean DEFAULT false NOT NULL,
	"reward_amount" numeric(10, 2),
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "user_referrals_referral_code_unique" UNIQUE("referral_code")
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
CREATE TABLE "refresh_token_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"replaced_by_token_hash" text,
	"revoked_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_device_health" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"device_id" text NOT NULL,
	"platform" "device_platform" NOT NULL,
	"app_version" text,
	"app_state" text,
	"network_type" text,
	"battery_level" integer,
	"is_charging" boolean,
	"subscription_alive" boolean DEFAULT false NOT NULL,
	"last_heartbeat_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"last_order_signal_at" timestamp with time zone,
	"last_push_received_at" timestamp with time zone,
	"last_order_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"data" jsonb,
	"image_url" text,
	"time_sensitive" boolean DEFAULT false NOT NULL,
	"category" text,
	"relevance_score" real,
	"query" jsonb,
	"target_count" integer DEFAULT 0 NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"status" "campaign_status" DEFAULT 'DRAFT' NOT NULL,
	"sent_by" uuid,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"data" jsonb,
	"type" "notification_type" NOT NULL,
	"campaign_id" uuid,
	"sent_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_telemetry_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"app_type" "device_app_type" NOT NULL,
	"platform" "device_platform" NOT NULL,
	"event_type" "push_telemetry_event_type" NOT NULL,
	"token" text,
	"device_id" text,
	"notification_title" text,
	"notification_body" text,
	"campaign_id" uuid,
	"order_id" uuid,
	"action_id" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotion_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"promotion_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"discount_amount" numeric(10, 2) DEFAULT 0 NOT NULL,
	"free_delivery_applied" boolean DEFAULT false NOT NULL,
	"referrer_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_hours" ADD CONSTRAINT "business_hours_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_subcategory_id_product_subcategories_id_fk" FOREIGN KEY ("subcategory_id") REFERENCES "public"."product_subcategories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_subcategories" ADD CONSTRAINT "product_subcategories_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_paid_by_users_id_fk" FOREIGN KEY ("paid_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dynamic_pricing_rules" ADD CONSTRAINT "dynamic_pricing_rules_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_pricing" ADD CONSTRAINT "product_pricing_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_pricing" ADD CONSTRAINT "product_pricing_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_behaviors" ADD CONSTRAINT "user_behaviors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_business_eligibility" ADD CONSTRAINT "promotion_business_eligibility_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_business_eligibility" ADD CONSTRAINT "promotion_business_eligibility_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_usage" ADD CONSTRAINT "promotion_usage_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_usage" ADD CONSTRAINT "promotion_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_usage" ADD CONSTRAINT "promotion_usage_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_usage" ADD CONSTRAINT "promotion_usage_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_promo_metadata" ADD CONSTRAINT "user_promo_metadata_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_promotions" ADD CONSTRAINT "user_promotions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_promotions" ADD CONSTRAINT "user_promotions_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_promotions" ADD CONSTRAINT "user_promotions_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_wallet" ADD CONSTRAINT "user_wallet_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_user_wallet_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."user_wallet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_promotions" ADD CONSTRAINT "order_promotions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_promotions" ADD CONSTRAINT "order_promotions_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_address" ADD CONSTRAINT "user_address_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_referrals" ADD CONSTRAINT "user_referrals_referrer_user_id_users_id_fk" FOREIGN KEY ("referrer_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_referrals" ADD CONSTRAINT "user_referrals_referred_user_id_users_id_fk" FOREIGN KEY ("referred_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_activity_tokens" ADD CONSTRAINT "live_activity_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_activity_tokens" ADD CONSTRAINT "live_activity_tokens_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_token_sessions" ADD CONSTRAINT "refresh_token_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_device_health" ADD CONSTRAINT "business_device_health_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_campaigns" ADD CONSTRAINT "notification_campaigns_sent_by_users_id_fk" FOREIGN KEY ("sent_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_campaign_id_notification_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."notification_campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_telemetry_events" ADD CONSTRAINT "push_telemetry_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_telemetry_events" ADD CONSTRAINT "push_telemetry_events_campaign_id_notification_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."notification_campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_redemptions" ADD CONSTRAINT "promotion_redemptions_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_redemptions" ADD CONSTRAINT "promotion_redemptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_redemptions" ADD CONSTRAINT "promotion_redemptions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_redemptions" ADD CONSTRAINT "promotion_redemptions_referrer_user_id_users_id_fk" FOREIGN KEY ("referrer_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_logs_actor_id" ON "audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_entity" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "device_tokens_token_idx" ON "device_tokens" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "device_tokens_user_device_app_type_idx" ON "device_tokens" USING btree ("user_id","device_id","app_type");--> statement-breakpoint
CREATE INDEX "idx_orders_user_id" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_orders_driver_id" ON "orders" USING btree ("driver_id");--> statement-breakpoint
CREATE INDEX "idx_orders_status" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_orders_status_created" ON "orders" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_orders_display_id" ON "orders" USING btree ("display_id");--> statement-breakpoint
CREATE INDEX "idx_order_items_product_id" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_products_business_id" ON "products" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_products_category_id" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_product_categories_business_id" ON "product_categories" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_product_subcategories_category_id" ON "product_subcategories" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_user_permissions_user_id" ON "user_permissions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_settlements_order_id" ON "settlements" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_settlements_driver_id" ON "settlements" USING btree ("driver_id");--> statement-breakpoint
CREATE INDEX "idx_settlements_business_id" ON "settlements" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_settlements_status" ON "settlements" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_settlements_type_direction" ON "settlements" USING btree ("type","direction");--> statement-breakpoint
CREATE INDEX "idx_promo_business" ON "promotion_business_eligibility" USING btree ("promotion_id","business_id");--> statement-breakpoint
CREATE INDEX "idx_promotion_usage_promo" ON "promotion_usage" USING btree ("promotion_id");--> statement-breakpoint
CREATE INDEX "idx_promotion_usage_user" ON "promotion_usage" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_promotion_usage_order" ON "promotion_usage" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_promotions_code" ON "promotions" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_promotions_active" ON "promotions" USING btree ("is_active","target");--> statement-breakpoint
CREATE INDEX "idx_promotions_target" ON "promotions" USING btree ("target");--> statement-breakpoint
CREATE INDEX "idx_user_promo_metadata_user" ON "user_promo_metadata" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_promotions_user" ON "user_promotions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_promotions_promo" ON "user_promotions" USING btree ("promotion_id");--> statement-breakpoint
CREATE INDEX "idx_user_promotions_active" ON "user_promotions" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_user_wallet_user" ON "user_wallet" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_wallet_transactions_wallet" ON "wallet_transactions" USING btree ("wallet_id");--> statement-breakpoint
CREATE INDEX "idx_wallet_transactions_user" ON "wallet_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_wallet_transactions_type" ON "wallet_transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_order_promotions_order_id" ON "order_promotions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_user_address_user_id" ON "user_address" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "refresh_token_sessions_token_hash_uq" ON "refresh_token_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "refresh_token_sessions_user_id_idx" ON "refresh_token_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "refresh_token_sessions_expires_at_idx" ON "refresh_token_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "business_device_health_user_device_idx" ON "business_device_health" USING btree ("user_id","device_id");--> statement-breakpoint
CREATE INDEX "idx_business_device_health_business" ON "business_device_health" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_business_device_health_last_heartbeat" ON "business_device_health" USING btree ("last_heartbeat_at");--> statement-breakpoint
CREATE INDEX "idx_business_device_health_last_order_signal" ON "business_device_health" USING btree ("last_order_signal_at");--> statement-breakpoint
CREATE INDEX "idx_business_device_health_last_push_received" ON "business_device_health" USING btree ("last_push_received_at");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_id" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_push_telemetry_events_created_at" ON "push_telemetry_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_push_telemetry_events_event_type" ON "push_telemetry_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_push_telemetry_events_app_type" ON "push_telemetry_events" USING btree ("app_type");--> statement-breakpoint
CREATE INDEX "idx_push_telemetry_events_platform" ON "push_telemetry_events" USING btree ("platform");--> statement-breakpoint
CREATE INDEX "idx_push_telemetry_events_user_id" ON "push_telemetry_events" USING btree ("user_id");