import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";

export const apiTokens = pgTable(
  "api_tokens",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    tokenHash: text("token_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
  (table) => [index("api_tokens_user_idx").on(table.userId)]
);

export type ApiTokenRow = typeof apiTokens.$inferSelect;
export type NewApiTokenRow = typeof apiTokens.$inferInsert;
