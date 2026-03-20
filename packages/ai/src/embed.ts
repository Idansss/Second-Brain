/**
 * Embedding pipeline — converts text to vectors for semantic search.
 * Uses Voyage AI voyage-3 (1024 dims) — Anthropic's recommended embedding provider.
 */

// Voyage AI has no official typed SDK yet, call their OpenAI-compatible REST API directly
const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";
const MODEL = "voyage-3";
export const EMBEDDING_DIMENSIONS = 1024;

async function callVoyage(input: string | string[]): Promise<number[][]> {
  const response = await fetch(VOYAGE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({ model: MODEL, input }),
  });

  if (!response.ok) {
    throw new Error(`Voyage AI error: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as {
    data: Array<{ embedding: number[]; index: number }>;
  };

  return data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

export async function embedText(text: string): Promise<number[]> {
  const results = await callVoyage(text.slice(0, 16000));
  return results[0]!;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  return callVoyage(texts.map((t) => t.slice(0, 16000)));
}

// Cosine similarity (for client-side re-ranking)
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
