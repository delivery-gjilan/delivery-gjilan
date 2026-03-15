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
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "business_device_health_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade
);

CREATE INDEX "idx_business_device_health_business" ON "business_device_health" ("business_id");
CREATE INDEX "idx_business_device_health_last_heartbeat" ON "business_device_health" ("last_heartbeat_at");
CREATE INDEX "idx_business_device_health_last_order_signal" ON "business_device_health" ("last_order_signal_at");
CREATE INDEX "idx_business_device_health_last_push_received" ON "business_device_health" ("last_push_received_at");
CREATE UNIQUE INDEX "business_device_health_user_device_idx" ON "business_device_health" ("user_id", "device_id");
