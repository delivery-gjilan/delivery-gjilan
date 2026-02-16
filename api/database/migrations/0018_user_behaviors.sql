CREATE TABLE IF NOT EXISTS "user_behaviors" (
    "user_id" uuid PRIMARY KEY NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS "idx_user_behaviors_last_order_at" ON "user_behaviors"("last_order_at");
CREATE INDEX IF NOT EXISTS "idx_user_behaviors_last_delivered_at" ON "user_behaviors"("last_delivered_at");
