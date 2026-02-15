ALTER TABLE users
  DROP COLUMN IF EXISTS driver_lat,
  DROP COLUMN IF EXISTS driver_lng,
  DROP COLUMN IF EXISTS driver_location_updated_at,
  DROP COLUMN IF EXISTS is_online;