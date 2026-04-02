-- Migration: Enhance banners table with business, product, promotion relationships
-- and scheduling functionality
-- Date: 2026-03-28

-- Step 1: Create enums for media type and display context
CREATE TYPE banner_media_type AS ENUM ('IMAGE', 'GIF', 'VIDEO');
CREATE TYPE banner_display_context AS ENUM ('HOME', 'BUSINESS', 'CATEGORY', 'PRODUCT', 'CART', 'ALL');

-- Step 2: Add new columns to banners table
ALTER TABLE banners
  ADD COLUMN IF NOT EXISTS media_type banner_media_type NOT NULL DEFAULT 'IMAGE',
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS promotion_id uuid REFERENCES promotions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS display_context banner_display_context NOT NULL DEFAULT 'HOME',
  ADD COLUMN IF NOT EXISTS starts_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS ends_at timestamp with time zone;

-- Step 3: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_banners_business_id ON banners(business_id);
CREATE INDEX IF NOT EXISTS idx_banners_product_id ON banners(product_id);
CREATE INDEX IF NOT EXISTS idx_banners_promotion_id ON banners(promotion_id);
CREATE INDEX IF NOT EXISTS idx_banners_display_context ON banners(display_context);
CREATE INDEX IF NOT EXISTS idx_banners_active_scheduled ON banners(is_active, starts_at, ends_at);

-- Step 4: Add comments for documentation
COMMENT ON COLUMN banners.media_type IS 'Type of media: IMAGE, GIF, or VIDEO';
COMMENT ON COLUMN banners.business_id IS 'Optional: Banner is specific to this business';
COMMENT ON COLUMN banners.product_id IS 'Optional: Banner promotes this specific product';
COMMENT ON COLUMN banners.promotion_id IS 'Optional: Banner is tied to this promotion/offer';
COMMENT ON COLUMN banners.display_context IS 'Where to display: HOME, BUSINESS, CATEGORY, PRODUCT, CART, or ALL pages';
COMMENT ON COLUMN banners.starts_at IS 'Optional: Banner becomes active at this time';
COMMENT ON COLUMN banners.ends_at IS 'Optional: Banner becomes inactive after this time';

-- Step 5: Update link_type to include 'promotion' if not already there
-- This is backward compatible with existing banners
COMMENT ON COLUMN banners.link_type IS 'Legacy link type: business, product, category, promotion, external, or none';
