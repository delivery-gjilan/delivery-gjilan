ALTER TABLE "orders"
ALTER COLUMN "order_date" TYPE timestamp with time zone
USING "order_date" AT TIME ZONE 'UTC';
