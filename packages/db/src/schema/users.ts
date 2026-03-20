import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export interface UserSettings {
  proactivityLevel: "quiet" | "normal" | "active";
  digestEnabled: boolean;
  digestTime: string; // HH:MM
  timezone: string;
  theme: "light" | "dark" | "system";
}

const defaultSettings: UserSettings = {
  proactivityLevel: "normal",
  digestEnabled: true,
  digestTime: "08:00",
  timezone: "UTC",
  theme: "system",
};

export const userProfiles = pgTable("user_profiles", {
  id: text("id").primaryKey(), // matches Supabase auth.users.id
  email: text("email").notNull(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  settings: jsonb("settings")
    .$type<UserSettings>()
    .notNull()
    .default(defaultSettings),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type UserProfileRow = typeof userProfiles.$inferSelect;
export type NewUserProfileRow = typeof userProfiles.$inferInsert;
