import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { notes } from "./notes";

export const collections = pgTable(
  "collections",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    emoji: text("emoji"),
    parentId: text("parent_id"), // nullable — null means root collection
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("collections_user_idx").on(table.userId),
    index("collections_parent_idx").on(table.parentId),
  ]
);

// Junction: notes ↔ collections (many-to-many)
export const collectionNotes = pgTable(
  "collection_notes",
  {
    collectionId: text("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    noteId: text("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("collection_notes_collection_idx").on(table.collectionId),
    index("collection_notes_note_idx").on(table.noteId),
  ]
);

export type CollectionRow = typeof collections.$inferSelect;
export type NewCollectionRow = typeof collections.$inferInsert;
