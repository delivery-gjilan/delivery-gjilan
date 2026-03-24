CREATE TYPE "public"."message_alert_type" AS ENUM('INFO', 'WARNING', 'URGENT');--> statement-breakpoint
CREATE TYPE "public"."message_sender_role" AS ENUM('ADMIN', 'DRIVER');--> statement-breakpoint
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
ALTER TABLE "driver_messages" ADD CONSTRAINT "driver_messages_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_messages" ADD CONSTRAINT "driver_messages_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
