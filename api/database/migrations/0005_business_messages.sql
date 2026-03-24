CREATE TYPE "public"."business_message_sender_role" AS ENUM('ADMIN', 'BUSINESS');--> statement-breakpoint
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
ALTER TABLE "business_messages" ADD CONSTRAINT "business_messages_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_messages" ADD CONSTRAINT "business_messages_business_user_id_users_id_fk" FOREIGN KEY ("business_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
