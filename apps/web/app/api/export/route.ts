import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { notes } from "@repo/db";
import { eq, and, desc } from "drizzle-orm";

import { db } from "@/server/db";

export async function GET() {
  // Auth check
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Fetch all active notes
  const userNotes = await db
    .select()
    .from(notes)
    .where(and(eq(notes.userId, user.id), eq(notes.status, "active")))
    .orderBy(desc(notes.createdAt));

  // Build markdown content
  const lines: string[] = [
    "# Second Brain Export",
    "",
    `> Exported on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} · ${userNotes.length} note${userNotes.length !== 1 ? "s" : ""}`,
    "",
    "---",
    "",
  ];

  for (const note of userNotes) {
    const content = note.content ?? "";
    const title =
      note.sourceTitle ||
      content.split("\n")[0]?.slice(0, 60) ||
      "Untitled";

    const metadata = (note.metadata ?? {}) as Record<string, unknown>;
    const summary = typeof metadata.summary === "string" ? metadata.summary : null;

    lines.push(`## ${title}`);
    lines.push("");
    lines.push(content);
    lines.push("");
    if (note.sourceUrl) lines.push(`**Source:** ${note.sourceUrl}`);
    lines.push(`**Type:** ${note.type}`);
    lines.push(
      `**Created:** ${new Date(note.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}`
    );
    if (summary) lines.push(`**Summary:** ${summary}`);
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  const markdown = lines.join("\n");

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": 'attachment; filename="second-brain-export.md"',
    },
  });
}
