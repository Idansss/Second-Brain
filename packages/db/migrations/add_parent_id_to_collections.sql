-- Add parentId to collections for nested collections support
ALTER TABLE "collections"
  ADD COLUMN IF NOT EXISTS "parent_id" text REFERENCES "collections"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "collections_parent_idx" ON "collections" ("parent_id");
