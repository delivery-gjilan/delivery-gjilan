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
ALTER TABLE "user_behaviors" ADD CONSTRAINT "user_behaviors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;