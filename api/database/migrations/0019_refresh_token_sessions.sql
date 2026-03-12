CREATE TABLE IF NOT EXISTS refresh_token_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  replaced_by_token_hash text,
  revoked_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS refresh_token_sessions_token_hash_uq
  ON refresh_token_sessions(token_hash);

CREATE INDEX IF NOT EXISTS refresh_token_sessions_user_id_idx
  ON refresh_token_sessions(user_id);

CREATE INDEX IF NOT EXISTS refresh_token_sessions_expires_at_idx
  ON refresh_token_sessions(expires_at);
