-- Create api_tokens table for personal API access
CREATE TABLE IF NOT EXISTS "api_tokens" (
  "id"          text PRIMARY KEY,
  "user_id"     text NOT NULL,
  "name"        text NOT NULL,
  "token_hash"  text NOT NULL,
  "created_at"  timestamptz NOT NULL DEFAULT now(),
  "last_used_at" timestamptz
);

CREATE INDEX IF NOT EXISTS "api_tokens_user_idx" ON "api_tokens" ("user_id");
