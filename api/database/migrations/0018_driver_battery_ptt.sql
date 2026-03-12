ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS battery_level integer,
  ADD COLUMN IF NOT EXISTS battery_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS battery_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_charging boolean;
