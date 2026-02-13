CREATE TYPE "public"."driver_connection_status" AS ENUM('CONNECTED', 'DISCONNECTED');--> statement-breakpoint
CREATE TABLE "drivers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"driver_lat" double precision,
	"driver_lng" double precision,
	"last_location_update" timestamp with time zone,
	"online_preference" boolean DEFAULT false NOT NULL,
	"connection_status" "driver_connection_status" DEFAULT 'DISCONNECTED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "drivers_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;