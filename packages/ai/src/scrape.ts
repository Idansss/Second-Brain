/**
 * URL scraping — extracts clean markdown content from any URL.
 * Uses Jina AI Reader (no API key required for basic use).
 */

export interface ScrapeResult {
  title: string;
  content: string;
  url: string;
  ogImage?: string;
  ogDescription?: string;
}

export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  // Jina Reader converts any URL to clean markdown
  const readerUrl = `https://r.jina.ai/${url}`;

  const response = await fetch(readerUrl, {
    headers: {
      Accept: "application/json",
      "X-Return-Format": "markdown",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to scrape URL: ${response.statusText}`);
  }

  const data = (await response.json()) as {
    data?: {
      title?: string;
      content?: string;
      description?: string;
      url?: string;
      images?: Record<string, string>;
    };
  };

  const result = data.data ?? {};

  return {
    title: result.title ?? new URL(url).hostname,
    content: result.content ?? "",
    url: result.url ?? url,
    ogDescription: result.description,
    ogImage: result.images ? Object.values(result.images)[0] : undefined,
  };
}
