import {
  pgTable,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { notes } from "./notes";

export const noteVersions = pgTable(
  "note_versions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    noteId: text("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    content: text("content").notNull().default(""),
    title: text("title"),
    userId: text("user_id").notNull(),
    savedAt: timestamp("saved_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("note_versions_note_idx").on(table.noteId),
    index("note_versions_user_idx").on(table.userId),
    index("note_versions_saved_at_idx").on(table.noteId, table.savedAt),
  ]
);

export type NoteVersionRow = typeof noteVersions.$inferSelect;
export type NewNoteVersionRow = typeof noteVersions.$inferInsert;
