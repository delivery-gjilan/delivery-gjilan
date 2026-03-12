CREATE TABLE IF NOT EXISTS "refresh_token_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"replaced_by_token_hash" text,
	"revoked_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "battery_level" integer;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "battery_opt_in" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "battery_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "is_charging" boolean;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferred_language" text DEFAULT 'en' NOT NULL;--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'refresh_token_sessions_user_id_users_id_fk'
	) THEN
		ALTER TABLE "refresh_token_sessions"
		ADD CONSTRAINT "refresh_token_sessions_user_id_users_id_fk"
		FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "refresh_token_sessions_token_hash_uq" ON "refresh_token_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "refresh_token_sessions_user_id_idx" ON "refresh_token_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "refresh_token_sessions_expires_at_idx" ON "refresh_token_sessions" USING btree ("expires_at");