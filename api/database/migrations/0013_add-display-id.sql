-- Add display_id column to orders table
-- Short, human-readable order identifier (e.g. "GJ-A3F8")

-- Step 1: Add column as nullable first
ALTER TABLE "orders" ADD COLUMN "display_id" varchar(10);

-- Step 2: Backfill existing orders with generated display IDs
UPDATE "orders"
SET "display_id" = 'GJ-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 4))
WHERE "display_id" IS NULL;

-- Step 3: Make column NOT NULL
ALTER TABLE "orders" ALTER COLUMN "display_id" SET NOT NULL;

-- Step 4: Add unique index
CREATE UNIQUE INDEX "idx_orders_display_id" ON "orders" ("display_id");
