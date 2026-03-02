-- Add soft deletion support
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE businesses ADD COLUMN deleted_at TIMESTAMPTZ;

-- Index for efficient filtering of non-deleted records
CREATE INDEX idx_users_deleted_at ON users (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_businesses_deleted_at ON businesses (deleted_at) WHERE deleted_at IS NULL;
