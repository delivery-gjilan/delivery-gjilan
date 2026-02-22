CREATE TYPE "public"."device_app_type" AS ENUM('CUSTOMER', 'DRIVER');--> statement-breakpoint
CREATE TYPE "public"."device_platform" AS ENUM('IOS', 'ANDROID');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('DRAFT', 'SENDING', 'SENT', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('ORDER_STATUS', 'ORDER_ASSIGNED', 'PROMOTIONAL', 'ADMIN_ALERT');--> statement-breakpoint
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
CREATE TABLE "notification_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"data" jsonb,
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
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_campaigns" ADD CONSTRAINT "notification_campaigns_sent_by_users_id_fk" FOREIGN KEY ("sent_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_campaign_id_notification_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."notification_campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "device_tokens_user_device_idx" ON "device_tokens" USING btree ("user_id","device_id");--> statement-breakpoint
CREATE UNIQUE INDEX "device_tokens_token_idx" ON "device_tokens" USING btree ("token");