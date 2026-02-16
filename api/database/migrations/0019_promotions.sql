DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'promotion_type') THEN
        CREATE TYPE "promotion_type" AS ENUM ('FIXED_DISCOUNT', 'PERCENT_DISCOUNT', 'FREE_DELIVERY', 'REFERRAL');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "promotions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "code" text NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "type" "promotion_type" NOT NULL,
    "value" numeric(10, 2) DEFAULT 0 NOT NULL,
    "max_redemptions" integer,
    "max_redemptions_per_user" integer,
    "free_delivery_count" integer,
    "first_order_only" boolean DEFAULT false NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "starts_at" timestamp with time zone,
    "ends_at" timestamp with time zone,
    "referrer_user_id" uuid,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "promotions_code_unique" UNIQUE ("code")
);

CREATE TABLE IF NOT EXISTS "promotion_redemptions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "promotion_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "order_id" uuid NOT NULL,
    "discount_amount" numeric(10, 2) DEFAULT 0 NOT NULL,
    "free_delivery_applied" boolean DEFAULT false NOT NULL,
    "referrer_user_id" uuid,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

DO $$ BEGIN
    ALTER TABLE "promotions" ADD CONSTRAINT "promotions_referrer_user_id_users_id_fk" FOREIGN KEY ("referrer_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "promotion_redemptions" ADD CONSTRAINT "promotion_redemptions_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "promotion_redemptions" ADD CONSTRAINT "promotion_redemptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "promotion_redemptions" ADD CONSTRAINT "promotion_redemptions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "promotion_redemptions" ADD CONSTRAINT "promotion_redemptions_referrer_user_id_users_id_fk" FOREIGN KEY ("referrer_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "idx_promotions_code" ON "promotions"("code");
CREATE INDEX IF NOT EXISTS "idx_promotions_is_active" ON "promotions"("is_active");
CREATE INDEX IF NOT EXISTS "idx_promotion_redemptions_promotion_id" ON "promotion_redemptions"("promotion_id");
CREATE INDEX IF NOT EXISTS "idx_promotion_redemptions_user_id" ON "promotion_redemptions"("user_id");
CREATE INDEX IF NOT EXISTS "idx_promotion_redemptions_order_id" ON "promotion_redemptions"("order_id");
