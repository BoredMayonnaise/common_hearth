-- Common Hearth — idempotent migrations, applied in order.
-- Safe to run against a database that already has the Day 2 schema.
-- Usage: psql "$DATABASE_URL" -f migrations.sql

-- Brute-force and spam guard. Server-side and shared by every process, so a
-- restart or a second instance cannot hand someone a fresh allowance.
CREATE TABLE IF NOT EXISTS auth_throttle (
  key          text PRIMARY KEY,
  hits         integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_throttle_window_idx ON auth_throttle (window_start);

-- Bumped whenever the password changes. The session token carries the value it
-- was minted with, so a stolen long-lived cookie stops working the moment the
-- owner resets their password.
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version integer NOT NULL DEFAULT 0;

-- Written by Day 3, absent from the Day 2 schema.sql.
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;

-- Password reset tokens. Single-use, short-lived, hashed before storage.
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx ON password_reset_tokens (user_id);