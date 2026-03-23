"use client";

import ReactMarkdown from "react-markdown";

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="md-body">
      <ReactMarkdown
        components={{
          h1: ({ children }) => <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, marginTop: 20, lineHeight: 1.3 }}>{children}</h1>,
          h2: ({ children }) => <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10, marginTop: 18, lineHeight: 1.3 }}>{children}</h2>,
          h3: ({ children }) => <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, marginTop: 14 }}>{children}</h3>,
          p: ({ children }) => <p style={{ fontSize: 14, lineHeight: 1.8, marginBottom: 12, color: "var(--color-text)", wordBreak: "break-word" }}>{children}</p>,
          ul: ({ children }) => <ul style={{ paddingLeft: 20, marginBottom: 12, display: "flex", flexDirection: "column", gap: 4 }}>{children}</ul>,
          ol: ({ children }) => <ol style={{ paddingLeft: 20, marginBottom: 12, display: "flex", flexDirection: "column", gap: 4 }}>{children}</ol>,
          li: ({ children }) => <li style={{ fontSize: 14, lineHeight: 1.7, color: "var(--color-text)" }}>{children}</li>,
          blockquote: ({ children }) => (
            <blockquote style={{
              borderLeft: "3px solid var(--color-accent)",
              paddingLeft: 14,
              margin: "12px 0",
              color: "var(--color-text-muted)",
              fontStyle: "italic",
            }}>
              {children}
            </blockquote>
          ),
          code: ({ inline, children }: { inline?: boolean; children?: React.ReactNode }) =>
            inline ? (
              <code style={{
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-border)",
                borderRadius: 4,
                padding: "1px 5px",
                fontSize: 12,
                fontFamily: "monospace",
              }}>
                {children}
              </code>
            ) : (
              <pre style={{
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                padding: "12px 14px",
                overflowX: "auto",
                margin: "12px 0",
              }}>
                <code style={{ fontSize: 12, fontFamily: "monospace", lineHeight: 1.6 }}>{children}</code>
              </pre>
            ),
          strong: ({ children }) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
          em: ({ children }) => <em style={{ fontStyle: "italic" }}>{children}</em>,
          hr: () => <hr style={{ border: "none", borderTop: "1px solid var(--color-border)", margin: "16px 0" }} />,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-accent)", textDecoration: "underline" }}>
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
