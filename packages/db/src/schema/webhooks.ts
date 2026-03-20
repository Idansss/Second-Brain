import { pgTable, text, timestamp, boolean, index } from "drizzle-orm/pg-core";

export const webhooks = pgTable(
  "webhooks",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    url: text("url").notNull(),
    events: text("events").array().notNull().default([]),
    secret: text("secret").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("webhooks_user_idx").on(table.userId)]
);

export type WebhookRow = typeof webhooks.$inferSelect;
export type NewWebhookRow = typeof webhooks.$inferInsert;
