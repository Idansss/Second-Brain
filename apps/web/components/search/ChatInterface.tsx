"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Brain } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { formatDistanceToNow } from "date-fns";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Array<{ id: string; title: string; createdAt: Date }>;
}

interface ChatInterfaceProps {
  /** Called with the query string each time the user sends a message. */
  onSearch?: (query: string) => void;
  /** When set, pre-fills the input and fires the query immediately. */
  pendingQuery?: string;
}

export function ChatInterface({ onSearch, pendingQuery }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const ask = trpc.chat.ask.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer,
          sources: data.sources.map((s) => ({
            ...s,
            createdAt: new Date(s.createdAt),
          })),
        },
      ]);
    },
  });

  // Fire a query when the parent injects a pendingQuery (history chip click)
  useEffect(() => {
    if (!pendingQuery) return;
    setInput(pendingQuery);
    // Use a microtask so the input state settles before we send
    const id = setTimeout(() => {
      handleSend(pendingQuery);
    }, 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingQuery]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend(overrideQuestion?: string) {
    const question = (overrideQuestion ?? input).trim();
    if (!question || ask.isPending) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    onSearch?.(question);
    ask.mutate({ question });
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--color-background)",
      }}
    >
      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 0", display: "flex", flexDirection: "column", gap: 24 }}>
        {messages.length === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: 300,
              gap: 12,
              color: "var(--color-text-muted)",
            }}
          >
            <Brain size={36} color="var(--color-accent)" />
            <p style={{ fontSize: 16, fontWeight: 500 }}>Ask your second brain</p>
            <p style={{ fontSize: 14, textAlign: "center", maxWidth: 340 }}>
              What do I know about [person]? Summarize my notes on [project].
              Have I seen this idea before?
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div
              style={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "75%",
                  padding: "10px 14px",
                  borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background: msg.role === "user" ? "var(--color-accent)" : "var(--color-surface)",
                  color: msg.role === "user" ? "white" : "var(--color-text)",
                  fontSize: 14,
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                }}
              >
                {msg.content}
              </div>
            </div>

            {/* Citations */}
            {msg.sources && msg.sources.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingLeft: 4 }}>
                {msg.sources.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      fontSize: 12,
                      padding: "3px 8px",
                      borderRadius: 4,
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    {s.title} ·{" "}
                    {formatDistanceToNow(new Date(s.createdAt), { addSuffix: true })}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {ask.isPending && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--color-text-muted)", fontSize: 13 }}>
            <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
            Searching your notes...
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        style={{
          padding: "16px 0",
          borderTop: "1px solid var(--color-border)",
          display: "flex",
          gap: 8,
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Ask anything about your notes..."
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid var(--color-border)",
            background: "var(--color-surface)",
            color: "var(--color-text)",
            fontSize: 14,
            outline: "none",
            fontFamily: "inherit",
          }}
        />
        <button
          type="button"
          aria-label="Send message"
          onClick={() => handleSend()}
          disabled={!input.trim() || ask.isPending}
          style={{
            padding: "0 16px",
            borderRadius: 10,
            border: "none",
            cursor: "pointer",
            background: "var(--color-accent)",
            color: "white",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 14,
            opacity: !input.trim() || ask.isPending ? 0.5 : 1,
          }}
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
