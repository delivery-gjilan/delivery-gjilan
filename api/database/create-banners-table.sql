-- Manual migration for banners table
-- Run this only if the banners table doesn't exist in your database
-- Check with: SELECT * FROM banners LIMIT 1;

CREATE TABLE IF NOT EXISTS "banners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text,
	"subtitle" text,
	"image_url" text NOT NULL,
	"link_type" text,
	"link_target" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Optional: Insert some sample banners for testing
INSERT INTO "banners" (title, subtitle, image_url, link_type, link_target, sort_order, is_active) VALUES
('Welcome Banner', 'Get 20% off your first order', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800', null, null, 1, true),
('New Restaurants', 'Check out our latest partners', 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800', null, null, 2, true),
('Fast Delivery', 'Get your food in 30 minutes or less', 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800', null, null, 3, true),
('Special Offers', 'Save more with our daily deals', 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800', null, null, 4, true)
ON CONFLICT DO NOTHING;
