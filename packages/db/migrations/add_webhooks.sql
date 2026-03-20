-- Create webhooks table for outbound event delivery
CREATE TABLE IF NOT EXISTS "webhooks" (
  "id"         text PRIMARY KEY,
  "user_id"    text NOT NULL,
  "url"        text NOT NULL,
  "events"     text[] NOT NULL DEFAULT '{}',
  "secret"     text NOT NULL,
  "active"     boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "webhooks_user_idx" ON "webhooks" ("user_id");
