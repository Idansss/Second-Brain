import {
  pgTable,
  text,
  timestamp,
  jsonb,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { notes } from "./notes";

export const entityTypeEnum = pgEnum("entity_type", [
  "person",
  "company",
  "project",
  "topic",
  "place",
]);

export const entities = pgTable(
  "entities",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    type: entityTypeEnum("type").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    aliases: jsonb("aliases").$type<string[]>().default([]),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("entities_user_idx").on(table.userId),
    index("entities_user_type_idx").on(table.userId, table.type),
  ]
);

// Junction: notes ↔ entities (many-to-many)
export const noteEntities = pgTable(
  "note_entities",
  {
    noteId: text("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    entityId: text("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    // How the entity appears in the note (e.g. "John", "John Smith")
    mentionedAs: text("mentioned_as"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("note_entities_note_idx").on(table.noteId),
    index("note_entities_entity_idx").on(table.entityId),
  ]
);

export type EntityRow = typeof entities.$inferSelect;
export type NewEntityRow = typeof entities.$inferInsert;
