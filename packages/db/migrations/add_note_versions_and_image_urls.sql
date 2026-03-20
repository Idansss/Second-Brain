-- Migration: Add note_versions table and image_urls column to notes
-- Run this against your Supabase PostgreSQL database.

-- 1. Add image_urls column to notes (stores array of public URLs as JSON)
ALTER TABLE "notes"
  ADD COLUMN IF NOT EXISTS "image_urls" jsonb DEFAULT '[]'::jsonb;

-- 2. Create note_versions table
CREATE TABLE IF NOT EXISTS "note_versions" (
  "id"       text PRIMARY KEY NOT NULL,
  "note_id"  text NOT NULL REFERENCES "notes"("id") ON DELETE CASCADE,
  "content"  text NOT NULL DEFAULT '',
  "title"    text,
  "user_id"  text NOT NULL,
  "saved_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 3. Indexes for note_versions
CREATE INDEX IF NOT EXISTS "note_versions_note_idx"
  ON "note_versions" USING btree ("note_id");

CREATE INDEX IF NOT EXISTS "note_versions_user_idx"
  ON "note_versions" USING btree ("user_id");

CREATE INDEX IF NOT EXISTS "note_versions_saved_at_idx"
  ON "note_versions" USING btree ("note_id", "saved_at");

-- 4. Supabase Storage bucket for note images
-- NOTE: Create the bucket manually in Supabase Dashboard → Storage → New bucket
--   Name: note-images
--   Public: true
-- Or run via Supabase Management API / supabase CLI:
--   supabase storage create-bucket note-images --public
