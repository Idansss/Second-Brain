/**
 * Chat with your knowledge base — RAG pipeline.
 * Takes a user question + relevant notes, streams a cited answer.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { Note } from "@repo/types";

const client = new Anthropic();

export interface ChatContext {
  notes: Array<Pick<Note, "id" | "content" | "sourceTitle" | "createdAt">>;
}

export async function* chatWithNotes(
  question: string,
  context: ChatContext
): AsyncGenerator<string> {
  const notesContext = context.notes
    .map(
      (n, i) =>
        `[NOTE ${i + 1}] (id: ${n.id}, saved: ${n.createdAt.toLocaleDateString()})\n${n.sourceTitle ? `Title: ${n.sourceTitle}\n` : ""}${n.content}`
    )
    .join("\n\n---\n\n");

  const systemPrompt = `You are the user's personal knowledge assistant. You have access to their saved notes, links, ideas, and meeting notes.

Answer their question using ONLY the provided notes. Always cite which notes you're drawing from using [NOTE N] references.

If the answer isn't in the notes, say so clearly. Never make up information.

Be concise and direct. Lead with the answer, then the supporting evidence.`;

  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Here are my notes:\n\n${notesContext}\n\n---\n\nQuestion: ${question}`,
      },
    ],
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield event.delta.text;
    }
  }
}
