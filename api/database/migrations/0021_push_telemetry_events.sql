DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        WHERE t.typname = 'push_telemetry_event_type'
    ) THEN
        CREATE TYPE "public"."push_telemetry_event_type" AS ENUM (
            'RECEIVED',
            'OPENED',
            'ACTION_TAPPED',
            'TOKEN_REGISTERED',
            'TOKEN_REFRESHED',
            'TOKEN_UNREGISTERED'
        );
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "push_telemetry_events" (
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

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'push_telemetry_events_user_id_users_id_fk'
    ) THEN
        ALTER TABLE "push_telemetry_events"
            ADD CONSTRAINT "push_telemetry_events_user_id_users_id_fk"
            FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
            ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'push_telemetry_events_campaign_id_notification_campaigns_id_fk'
    ) THEN
        ALTER TABLE "push_telemetry_events"
            ADD CONSTRAINT "push_telemetry_events_campaign_id_notification_campaigns_id_fk"
            FOREIGN KEY ("campaign_id") REFERENCES "public"."notification_campaigns"("id")
            ON DELETE set null ON UPDATE no action;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_push_telemetry_events_created_at" ON "push_telemetry_events" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_push_telemetry_events_event_type" ON "push_telemetry_events" ("event_type");
CREATE INDEX IF NOT EXISTS "idx_push_telemetry_events_app_type" ON "push_telemetry_events" ("app_type");
CREATE INDEX IF NOT EXISTS "idx_push_telemetry_events_platform" ON "push_telemetry_events" ("platform");
CREATE INDEX IF NOT EXISTS "idx_push_telemetry_events_user_id" ON "push_telemetry_events" ("user_id");
