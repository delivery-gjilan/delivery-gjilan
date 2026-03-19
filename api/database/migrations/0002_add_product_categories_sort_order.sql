-- Add sort_order support for product categories (backend-persisted category ordering)

ALTER TABLE product_categories
    ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
