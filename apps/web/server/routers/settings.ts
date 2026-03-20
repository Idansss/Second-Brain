import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { userProfiles } from "@repo/db";
import { eq } from "drizzle-orm";

import { db } from "../db";

const UserSettingsSchema = z.object({
  proactivityLevel: z.enum(["quiet", "normal", "active"]),
  digestEnabled: z.boolean(),
  digestTime: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string(),
  theme: z.enum(["light", "dark", "system"]),
});

export const settingsRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.id, ctx.user.id));

    if (!profile) {
      // Auto-create profile on first load
      const [created] = await db
        .insert(userProfiles)
        .values({
          id: ctx.user.id,
          email: ctx.user.email ?? "",
        })
        .returning();
      return created!;
    }
    return profile;
  }),

  update: protectedProcedure
    .input(UserSettingsSchema.partial())
    .mutation(async ({ ctx, input }) => {
      const [profile] = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.id, ctx.user.id));

      if (!profile) {
        const [created] = await db
          .insert(userProfiles)
          .values({ id: ctx.user.id, email: ctx.user.email ?? "" })
          .returning();
        return created!;
      }

      const [updated] = await db
        .update(userProfiles)
        .set({
          settings: { ...profile.settings, ...input },
          updatedAt: new Date(),
        })
        .where(eq(userProfiles.id, ctx.user.id))
        .returning();
      return updated!;
    }),

  updateProfile: protectedProcedure
    .input(z.object({ displayName: z.string().optional(), avatarUrl: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(userProfiles)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(userProfiles.id, ctx.user.id))
        .returning();
      return updated!;
    }),
});
