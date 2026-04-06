ALTER TABLE "promotions" ADD COLUMN "order_id" uuid REFERENCES "orders"("id") ON DELETE SET NULL;
