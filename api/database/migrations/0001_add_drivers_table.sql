-- Create driver connection status enum
CREATE TYPE driver_connection_status AS ENUM ('CONNECTED', 'DISCONNECTED');

-- Create drivers table
CREATE TABLE drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- Location fields
  driver_lat DOUBLE PRECISION,
  driver_lng DOUBLE PRECISION,
  
  -- Last location update timestamp - used by heartbeat checker
  last_location_update TIMESTAMP WITH TIME ZONE,
  
  -- User's preference: "I want to work" toggle
  online_preference BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- System-calculated: actively receiving updates?
  connection_status driver_connection_status NOT NULL DEFAULT 'DISCONNECTED',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index for common queries
CREATE INDEX idx_drivers_user_id ON drivers(user_id);
CREATE INDEX idx_drivers_connection_status ON drivers(connection_status);
CREATE INDEX idx_drivers_online_preference ON drivers(online_preference);

-- Optional: Create index for heartbeat checker efficiency
CREATE INDEX idx_drivers_last_location_update ON drivers(last_location_update DESC NULLS LAST);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
