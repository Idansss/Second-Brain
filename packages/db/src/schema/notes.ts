import {
  pgTable,
  text,
  timestamp,
  jsonb,
  pgEnum,
  vector,
  index,
} from "drizzle-orm/pg-core";

export const noteTypeEnum = pgEnum("note_type", [
  "text",
  "link",
  "voice",
  "task",
  "meeting",
  "file",
  "highlight",
]);

export const noteStatusEnum = pgEnum("note_status", [
  "active",
  "archived",
  "deleted",
]);

export const notes = pgTable(
  "notes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    type: noteTypeEnum("type").notNull().default("text"),
    status: noteStatusEnum("status").notNull().default("active"),

    // Content
    content: text("content").notNull().default(""),
    contentMarkdown: text("content_markdown"),

    // Source
    sourceUrl: text("source_url"),
    sourceTitle: text("source_title"),

    // Flexible metadata (voice duration, og data, file info, etc.)
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),

    // Attached image public URLs (stored in Supabase Storage)
    imageUrls: jsonb("image_urls").$type<string[]>().default([]),

    // Vector embedding for semantic search (1024 dims = voyage-3)
    embedding: vector("embedding", { dimensions: 1024 }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Semantic similarity search
    index("notes_embedding_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops")
    ),
    // Fast user+status queries
    index("notes_user_status_idx").on(table.userId, table.status),
    // Chronological feeds
    index("notes_user_created_idx").on(table.userId, table.createdAt),
  ]
);

export type NoteRow = typeof notes.$inferSelect;
export type NewNoteRow = typeof notes.$inferInsert;
