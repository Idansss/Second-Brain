import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { notes, tasks, userProfiles } from "@repo/db";
import { generateDailyDigest } from "@repo/ai";
import { eq, and, gte, desc } from "drizzle-orm";
import type { Note, Task } from "@repo/types";

import { db } from "../db";

export const digestRouter = router({
  generate: protectedProcedure.mutation(async ({ ctx }) => {
    const now = new Date();
    const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(now.getDate() - 7);
    const fourteenDaysAgo = new Date(now); fourteenDaysAgo.setDate(now.getDate() - 14);

    const [recentNotes, prevWeekNotes, openTasks, profile] = await Promise.all([
      db.select().from(notes)
        .where(and(eq(notes.userId, ctx.user.id), gte(notes.createdAt, sevenDaysAgo), eq(notes.status, "active")))
        .orderBy(desc(notes.createdAt)).limit(30),
      db.select().from(notes)
        .where(and(eq(notes.userId, ctx.user.id), gte(notes.createdAt, fourteenDaysAgo), eq(notes.status, "active")))
        .orderBy(desc(notes.createdAt)).limit(30),
      db.select().from(tasks)
        .where(and(eq(tasks.userId, ctx.user.id), eq(tasks.status, "todo"))).limit(20),
      db.select().from(userProfiles)
        .where(eq(userProfiles.id, ctx.user.id)).then((r) => r[0]),
    ]);

    // prevWeekNotes from DB covers 14 days ago to now; exclude this week's to get prev week only
    const prevWeekOnly = prevWeekNotes.filter(n => new Date(n.createdAt) < sevenDaysAgo);

    const userName = profile?.displayName ?? ctx.user.email?.split("@")[0] ?? "there";

    const digest = await generateDailyDigest({
      recentNotes: recentNotes as Note[],
      prevWeekNotes: prevWeekOnly as Note[],
      openTasks: openTasks as Task[],
      userName,
    });

    return digest;
  }),
});
