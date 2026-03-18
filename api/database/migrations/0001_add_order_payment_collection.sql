-- Add order payment collection mode to distinguish cash-vs-prepaid settlement behavior

DO $$ BEGIN
    CREATE TYPE order_payment_collection AS ENUM ('CASH_TO_DRIVER', 'PREPAID_TO_PLATFORM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS payment_collection order_payment_collection NOT NULL DEFAULT 'CASH_TO_DRIVER';
