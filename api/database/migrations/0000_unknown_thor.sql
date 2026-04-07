CREATE TYPE "public"."action_type" AS ENUM('USER_CREATED', 'USER_UPDATED', 'USER_DELETED', 'USER_ROLE_CHANGED', 'BUSINESS_CREATED', 'BUSINESS_UPDATED', 'BUSINESS_DELETED', 'BUSINESS_APPROVED', 'BUSINESS_REJECTED', 'PRODUCT_CREATED', 'PRODUCT_UPDATED', 'PRODUCT_DELETED', 'PRODUCT_PUBLISHED', 'PRODUCT_UNPUBLISHED', 'PRODUCT_AVAILABILITY_CHANGED', 'PRODUCT_PRICE_CHANGED', 'ORDER_CREATED', 'ORDER_UPDATED', 'ORDER_STATUS_CHANGED', 'ORDER_CANCELLED', 'ORDER_ASSIGNED', 'ORDER_DELIVERED', 'SETTLEMENT_CREATED', 'SETTLEMENT_PAID', 'SETTLEMENT_PARTIAL_PAID', 'SETTLEMENT_UNSETTLED', 'DRIVER_CREATED', 'DRIVER_UPDATED', 'DRIVER_APPROVED', 'DRIVER_REJECTED', 'DRIVER_STATUS_CHANGED', 'USER_LOGIN', 'USER_LOGOUT', 'PASSWORD_CHANGED', 'PASSWORD_RESET', 'CATEGORY_CREATED', 'CATEGORY_UPDATED', 'CATEGORY_DELETED', 'SUBCATEGORY_CREATED', 'SUBCATEGORY_UPDATED', 'SUBCATEGORY_DELETED');--> statement-breakpoint
CREATE TYPE "public"."actor_type" AS ENUM('ADMIN', 'BUSINESS', 'DRIVER', 'CUSTOMER', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."entity_type" AS ENUM('USER', 'BUSINESS', 'PRODUCT', 'ORDER', 'SETTLEMENT', 'DRIVER', 'CATEGORY', 'SUBCATEGORY', 'DELIVERY_ZONE');--> statement-breakpoint
CREATE TYPE "public"."banner_display_context" AS ENUM('HOME', 'BUSINESS', 'CATEGORY', 'PRODUCT', 'CART', 'ALL');--> statement-breakpoint
CREATE TYPE "public"."banner_media_type" AS ENUM('IMAGE', 'GIF', 'VIDEO');--> statement-breakpoint
CREATE TYPE "public"."business_type" AS ENUM('MARKET', 'PHARMACY', 'RESTAURANT');--> statement-breakpoint
CREATE TYPE "public"."business_message_sender_role" AS ENUM('ADMIN', 'BUSINESS');--> statement-breakpoint
CREATE TYPE "public"."message_alert_type" AS ENUM('INFO', 'WARNING', 'URGENT');--> statement-breakpoint
CREATE TYPE "public"."device_app_type" AS ENUM('CUSTOMER', 'DRIVER', 'BUSINESS', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."device_platform" AS ENUM('IOS', 'ANDROID');--> statement-breakpoint
CREATE TYPE "public"."message_sender_role" AS ENUM('ADMIN', 'DRIVER');--> statement-breakpoint
CREATE TYPE "public"."driver_connection_status" AS ENUM('CONNECTED', 'STALE', 'LOST', 'DISCONNECTED');--> statement-breakpoint
CREATE TYPE "public"."order_payment_collection" AS ENUM('CASH_TO_DRIVER', 'PREPAID_TO_PLATFORM');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('PENDING', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'AWAITING_APPROVAL');--> statement-breakpoint
CREATE TYPE "public"."order_event_actor_type" AS ENUM('SYSTEM', 'RESTAURANT', 'DRIVER', 'CUSTOMER', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."order_event_type" AS ENUM('ORDER_CREATED', 'ORDER_PREPARING', 'ORDER_READY', 'ORDER_PICKED_UP', 'ORDER_DELIVERED', 'ORDER_CANCELLED', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVED_PICKUP', 'DISPATCH_SENT', 'PREP_TIME_UPDATED');--> statement-breakpoint
CREATE TYPE "public"."signup_step" AS ENUM('INITIAL', 'EMAIL_SENT', 'EMAIL_VERIFIED', 'PHONE_SENT', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('CUSTOMER', 'DRIVER', 'SUPER_ADMIN', 'ADMIN', 'BUSINESS_OWNER', 'BUSINESS_EMPLOYEE');--> statement-breakpoint
CREATE TYPE "public"."user_permission" AS ENUM('view_orders', 'manage_orders', 'view_products', 'manage_products', 'view_finances', 'manage_settings', 'view_analytics');--> statement-breakpoint
CREATE TYPE "public"."settlement_direction" AS ENUM('RECEIVABLE', 'PAYABLE');--> statement-breakpoint
CREATE TYPE "public"."settlement_type" AS ENUM('DRIVER', 'BUSINESS');--> statement-breakpoint
CREATE TYPE "public"."settlement_entity_type" AS ENUM('DRIVER', 'BUSINESS');--> statement-breakpoint
CREATE TYPE "public"."settlement_rule_amount_type" AS ENUM('FIXED', 'PERCENT');--> statement-breakpoint
CREATE TYPE "public"."settlement_rule_type" AS ENUM('ORDER_PRICE', 'DELIVERY_PRICE');--> statement-breakpoint
CREATE TYPE "public"."settlement_request_status" AS ENUM('PENDING_APPROVAL', 'ACCEPTED', 'DISPUTED', 'EXPIRED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."promotion_creator_type" AS ENUM('PLATFORM', 'BUSINESS');--> statement-breakpoint
CREATE TYPE "public"."promotion_target" AS ENUM('ALL_USERS', 'SPECIFIC_USERS', 'FIRST_ORDER', 'CONDITIONAL');--> statement-breakpoint
CREATE TYPE "public"."promotion_type" AS ENUM('FIXED_AMOUNT', 'PERCENTAGE', 'FREE_DELIVERY', 'SPEND_X_GET_FREE', 'SPEND_X_PERCENT', 'SPEND_X_FIXED');--> statement-breakpoint
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
	"media_type" "banner_media_type" DEFAULT 'IMAGE' NOT NULL,
	"business_id" uuid,
	"product_id" uuid,
	"promotion_id" uuid,
	"link_type" text,
	"link_target" text,
	"display_context" "banner_display_context" DEFAULT 'HOME' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
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
	"is_temporarily_closed" boolean DEFAULT false NOT NULL,
	"temporary_closure_reason" varchar(500),
	"commission_percentage" numeric(5, 2) DEFAULT '0' NOT NULL,
	"min_order_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"featured_sort_order" integer DEFAULT 0 NOT NULL,
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
CREATE TABLE "business_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"business_user_id" uuid NOT NULL,
	"sender_role" "business_message_sender_role" NOT NULL,
	"body" text NOT NULL,
	"alert_type" "message_alert_type" DEFAULT 'INFO' NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
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
	"is_service_zone" boolean DEFAULT false NOT NULL,
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
CREATE TABLE "driver_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"driver_id" uuid NOT NULL,
	"sender_role" "message_sender_role" NOT NULL,
	"body" text NOT NULL,
	"alert_type" "message_alert_type" DEFAULT 'INFO' NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
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
	"has_own_vehicle" boolean DEFAULT false NOT NULL,
	"max_active_orders" numeric(3, 0) DEFAULT '2' NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
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
	"business_id" uuid NOT NULL,
	"original_price" numeric(10, 2),
	"base_price" numeric(10, 2) NOT NULL,
	"markup_price" numeric(10, 2) DEFAULT 0 NOT NULL,
	"actual_price" numeric(10, 2) NOT NULL,
	"business_price" numeric(10, 2),
	"original_delivery_price" numeric(10, 2),
	"delivery_price" numeric(10, 2) NOT NULL,
	"priority_surcharge" numeric(10, 2) DEFAULT 0 NOT NULL,
	"payment_collection" "order_payment_collection" DEFAULT 'CASH_TO_DRIVER' NOT NULL,
	"status" "order_status" NOT NULL,
	"dropoff_lat" double precision NOT NULL,
	"dropoff_lng" double precision NOT NULL,
	"dropoff_address" varchar(500) NOT NULL,
	"location_flagged" boolean DEFAULT false NOT NULL,
	"driver_notes" varchar(500),
	"cancellation_reason" varchar(500),
	"admin_note" varchar(2000),
	"cancelled_at" timestamp with time zone,
	"preparation_minutes" integer,
	"estimated_ready_at" timestamp with time zone,
	"preparing_at" timestamp with time zone,
	"ready_at" timestamp with time zone,
	"out_for_delivery_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"driver_assigned_at" timestamp with time zone,
	"driver_arrived_at_pickup" timestamp with time zone,
	"order_date" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"parent_order_item_id" uuid,
	"quantity" integer NOT NULL,
	"base_price" numeric(10, 2) NOT NULL,
	"sale_discount_percentage" numeric(5, 2),
	"markup_price" numeric(10, 2),
	"night_marked_up_price" numeric(10, 2),
	"final_applied_price" numeric(10, 2) NOT NULL,
	"notes" varchar(500),
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"event_type" "order_event_type" NOT NULL,
	"event_ts" timestamp with time zone NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"actor_type" "order_event_actor_type",
	"actor_id" uuid,
	"business_id" uuid,
	"driver_id" uuid,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"subcategory_id" uuid,
	"group_id" uuid,
	"is_offer" boolean DEFAULT false NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(1000),
	"image_url" varchar(500),
	"base_price" numeric(10, 2) NOT NULL,
	"markup_price" numeric(10, 2),
	"night_marked_up_price" numeric(10, 2),
	"is_on_sale" boolean DEFAULT false,
	"sale_discount_percentage" numeric(5, 2),
	"is_available" boolean DEFAULT true,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
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
	"email_opt_out" boolean DEFAULT false NOT NULL,
	"business_id" uuid,
	"email_verification_code" text,
	"phone_verification_code" text,
	"admin_note" text,
	"flag_color" text DEFAULT 'yellow',
	"is_demo_account" boolean DEFAULT false NOT NULL,
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
	"order_id" uuid,
	"rule_id" uuid,
	"settlement_payment_id" uuid,
	"source_payment_id" uuid,
	"amount" numeric(10, 2) NOT NULL,
	"is_settled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settlement_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"type" "settlement_rule_type" NOT NULL,
	"entity_type" "settlement_entity_type" NOT NULL,
	"direction" "settlement_direction" NOT NULL,
	"amount_type" "settlement_rule_amount_type" NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"max_amount" numeric(10, 2),
	"business_id" uuid,
	"promotion_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"notes" varchar(500),
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settlement_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" "settlement_entity_type" DEFAULT 'BUSINESS' NOT NULL,
	"business_id" uuid,
	"driver_id" uuid,
	"requested_by_user_id" uuid,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'EUR' NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"note" text,
	"status" "settlement_request_status" DEFAULT 'PENDING_APPROVAL' NOT NULL,
	"responded_at" timestamp with time zone,
	"responded_by_user_id" uuid,
	"dispute_reason" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settlement_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" "settlement_entity_type" NOT NULL,
	"driver_id" uuid,
	"business_id" uuid,
	"amount" numeric(10, 2) NOT NULL,
	"note" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
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
	"creator_type" "promotion_creator_type" DEFAULT 'PLATFORM' NOT NULL,
	"creator_id" uuid,
	"is_recovery" boolean DEFAULT false NOT NULL,
	"order_id" uuid,
	"is_deleted" boolean DEFAULT false NOT NULL,
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
	"dispatch_mode_enabled" boolean DEFAULT false NOT NULL,
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
	"title_al" text,
	"body_al" text,
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
CREATE TABLE "product_variant_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "option_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"min_selections" integer DEFAULT 0 NOT NULL,
	"max_selections" integer DEFAULT 1 NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"option_group_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"extra_price" numeric(10, 2) DEFAULT 0 NOT NULL,
	"image_url" text,
	"linked_product_id" uuid,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_item_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_item_id" uuid NOT NULL,
	"option_group_id" uuid NOT NULL,
	"option_id" uuid NOT NULL,
	"price_at_order" numeric(10, 2) NOT NULL,
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
ALTER TABLE "banners" ADD CONSTRAINT "banners_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "banners" ADD CONSTRAINT "banners_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "banners" ADD CONSTRAINT "banners_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_hours" ADD CONSTRAINT "business_hours_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_messages" ADD CONSTRAINT "business_messages_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_messages" ADD CONSTRAINT "business_messages_business_user_id_users_id_fk" FOREIGN KEY ("business_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_messages" ADD CONSTRAINT "driver_messages_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_messages" ADD CONSTRAINT "driver_messages_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_parent_order_item_id_order_items_id_fk" FOREIGN KEY ("parent_order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_subcategory_id_product_subcategories_id_fk" FOREIGN KEY ("subcategory_id") REFERENCES "public"."product_subcategories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_group_id_product_variant_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."product_variant_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_subcategories" ADD CONSTRAINT "product_subcategories_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_rule_id_settlement_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."settlement_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_settlement_payment_id_settlement_payments_id_fk" FOREIGN KEY ("settlement_payment_id") REFERENCES "public"."settlement_payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_source_payment_id_settlement_payments_id_fk" FOREIGN KEY ("source_payment_id") REFERENCES "public"."settlement_payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_rules" ADD CONSTRAINT "settlement_rules_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_rules" ADD CONSTRAINT "settlement_rules_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_requests" ADD CONSTRAINT "settlement_requests_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_requests" ADD CONSTRAINT "settlement_requests_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_requests" ADD CONSTRAINT "settlement_requests_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_requests" ADD CONSTRAINT "settlement_requests_responded_by_user_id_users_id_fk" FOREIGN KEY ("responded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_payments" ADD CONSTRAINT "settlement_payments_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_payments" ADD CONSTRAINT "settlement_payments_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_payments" ADD CONSTRAINT "settlement_payments_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_behaviors" ADD CONSTRAINT "user_behaviors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_business_eligibility" ADD CONSTRAINT "promotion_business_eligibility_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_business_eligibility" ADD CONSTRAINT "promotion_business_eligibility_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_usage" ADD CONSTRAINT "promotion_usage_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_usage" ADD CONSTRAINT "promotion_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_usage" ADD CONSTRAINT "promotion_usage_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_usage" ADD CONSTRAINT "promotion_usage_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_creator_id_businesses_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_promo_metadata" ADD CONSTRAINT "user_promo_metadata_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_promotions" ADD CONSTRAINT "user_promotions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_promotions" ADD CONSTRAINT "user_promotions_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_promotions" ADD CONSTRAINT "user_promotions_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "product_variant_groups" ADD CONSTRAINT "product_variant_groups_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "option_groups" ADD CONSTRAINT "option_groups_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "options" ADD CONSTRAINT "options_option_group_id_option_groups_id_fk" FOREIGN KEY ("option_group_id") REFERENCES "public"."option_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "options" ADD CONSTRAINT "options_linked_product_id_products_id_fk" FOREIGN KEY ("linked_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_options" ADD CONSTRAINT "order_item_options_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_options" ADD CONSTRAINT "order_item_options_option_group_id_option_groups_id_fk" FOREIGN KEY ("option_group_id") REFERENCES "public"."option_groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_options" ADD CONSTRAINT "order_item_options_option_id_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."options"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
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
CREATE INDEX "idx_orders_business_id" ON "orders" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_orders_display_id" ON "orders" USING btree ("display_id");--> statement-breakpoint
CREATE INDEX "idx_order_items_order_id" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_order_items_product_id" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_order_items_parent" ON "order_items" USING btree ("parent_order_item_id");--> statement-breakpoint
CREATE INDEX "idx_order_events_order_id" ON "order_events" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_order_events_event_type" ON "order_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_order_events_event_ts" ON "order_events" USING btree ("event_ts");--> statement-breakpoint
CREATE INDEX "idx_order_events_business_id" ON "order_events" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_order_events_driver_id" ON "order_events" USING btree ("driver_id");--> statement-breakpoint
CREATE INDEX "idx_products_business_id" ON "products" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_products_category_id" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_product_categories_business_id" ON "product_categories" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_product_subcategories_category_id" ON "product_subcategories" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_user_permissions_user_id" ON "user_permissions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_settlements_order_id" ON "settlements" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_settlements_driver_id" ON "settlements" USING btree ("driver_id");--> statement-breakpoint
CREATE INDEX "idx_settlements_business_id" ON "settlements" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_settlements_is_settled" ON "settlements" USING btree ("is_settled");--> statement-breakpoint
CREATE INDEX "idx_settlements_type_direction" ON "settlements" USING btree ("type","direction");--> statement-breakpoint
CREATE INDEX "idx_settlement_requests_business_id" ON "settlement_requests" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_settlement_requests_driver_id" ON "settlement_requests" USING btree ("driver_id");--> statement-breakpoint
CREATE INDEX "idx_settlement_requests_entity_type" ON "settlement_requests" USING btree ("entity_type");--> statement-breakpoint
CREATE INDEX "idx_settlement_requests_status" ON "settlement_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_settlement_requests_created_at" ON "settlement_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_settlement_payments_entity_type" ON "settlement_payments" USING btree ("entity_type");--> statement-breakpoint
CREATE INDEX "idx_settlement_payments_driver_id" ON "settlement_payments" USING btree ("driver_id");--> statement-breakpoint
CREATE INDEX "idx_settlement_payments_business_id" ON "settlement_payments" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_settlement_payments_created_at" ON "settlement_payments" USING btree ("created_at");--> statement-breakpoint
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
CREATE INDEX "idx_push_telemetry_events_user_id" ON "push_telemetry_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_option_groups_product_id" ON "option_groups" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_options_option_group_id" ON "options" USING btree ("option_group_id");--> statement-breakpoint
CREATE INDEX "idx_options_linked_product_id" ON "options" USING btree ("linked_product_id");--> statement-breakpoint
CREATE INDEX "idx_order_item_options_order_item_id" ON "order_item_options" USING btree ("order_item_id");