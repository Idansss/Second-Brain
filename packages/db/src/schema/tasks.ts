import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { notes } from "./notes";

export const taskStatusEnum = pgEnum("task_status", [
  "todo",
  "in_progress",
  "done",
  "cancelled",
]);

export const taskPriorityEnum = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

export const tasks = pgTable(
  "tasks",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    // The note this task was extracted from (if any)
    sourceNoteId: text("source_note_id").references(() => notes.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    // AI-generated "why this exists" — the context behind the task
    context: text("context"),
    status: taskStatusEnum("status").notNull().default("todo"),
    priority: taskPriorityEnum("priority").notNull().default("medium"),
    dueDate: timestamp("due_date", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("tasks_user_status_idx").on(table.userId, table.status),
    index("tasks_user_due_idx").on(table.userId, table.dueDate),
  ]
);

export type TaskRow = typeof tasks.$inferSelect;
export type NewTaskRow = typeof tasks.$inferInsert;
