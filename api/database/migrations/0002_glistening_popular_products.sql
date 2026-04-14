ALTER TABLE "products" ADD COLUMN "order_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint

UPDATE "products" AS p
SET "order_count" = agg.total_qty
FROM (
    SELECT
        oi."product_id",
        COALESCE(SUM(oi."quantity"), 0)::int AS total_qty
    FROM "order_items" oi
    INNER JOIN "orders" o ON o."id" = oi."order_id"
    WHERE o."status" = 'DELIVERED'
      AND oi."parent_order_item_id" IS NULL
    GROUP BY oi."product_id"
) AS agg
WHERE p."id" = agg."product_id";