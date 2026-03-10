-- Create Live Activity Tokens table for iOS Dynamic Island delivery tracking
-- Live Activities are specific to a single order and require unique push tokens

CREATE TABLE IF NOT EXISTS live_activity_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    activity_id TEXT NOT NULL UNIQUE,
    push_token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups by order_id (main query pattern)
CREATE INDEX IF NOT EXISTS live_activity_tokens_order_id_idx ON live_activity_tokens(order_id);

-- Create index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS live_activity_tokens_user_id_idx ON live_activity_tokens(user_id);

-- Add comment explaining the table purpose
COMMENT ON TABLE live_activity_tokens IS 'iOS Live Activity push tokens for Dynamic Island delivery tracking. Each token is tied to a specific order and expires when the order is completed.';
