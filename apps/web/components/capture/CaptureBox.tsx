"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Link2, Mic, FileText, X, Send, Loader2, Tag, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import styles from "./CaptureBox.module.css";
import { useRouter } from "next/navigation";

type Mode = "text" | "link" | "voice";

// Extend the Window type to handle vendor-prefixed SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export function CaptureBox() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [speechSupported, setSpeechSupported] = useState<boolean | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Smart suggestions state
  const [debouncedText, setDebouncedText] = useState("");
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-tag suggestions state
  const [debouncedTagText, setDebouncedTagText] = useState("");
  const [manualTags, setManualTags] = useState<string[]>([]);
  const [tagsDismissed, setTagsDismissed] = useState(false);
  const tagDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const suggestTagsMutation = trpc.intelligence.suggestTags.useMutation();

  // Debounce for tag suggestions (500ms, 50+ chars)
  useEffect(() => {
    if (mode !== "text") return;
    if (tagDebounceRef.current) clearTimeout(tagDebounceRef.current);
    if (text.length >= 50) {
      tagDebounceRef.current = setTimeout(() => {
        setDebouncedTagText(text);
        setTagsDismissed(false);
      }, 500);
    } else {
      setDebouncedTagText("");
    }
    return () => {
      if (tagDebounceRef.current) clearTimeout(tagDebounceRef.current);
    };
  }, [text, mode]);

  // Fire suggestTags mutation when debounced text changes
  useEffect(() => {
    if (debouncedTagText.length >= 50 && !tagsDismissed) {
      suggestTagsMutation.mutate({ content: debouncedTagText });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTagText]);

  const suggestedTags = suggestTagsMutation.data?.tags ?? [];
  const showTagSuggestions =
    !tagsDismissed &&
    mode === "text" &&
    text.length >= 50 &&
    suggestedTags.length > 0;

  function addTag(tag: string) {
    if (!manualTags.includes(tag)) {
      setManualTags((prev) => [...prev, tag]);
    }
  }

  function removeTag(tag: string) {
    setManualTags((prev) => prev.filter((t) => t !== tag));
  }

  // Debounce text input for suggestions (1.5s, only when text tab active and 30+ chars)
  useEffect(() => {
    if (mode !== "text") return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.length >= 30) {
      debounceRef.current = setTimeout(() => {
        setDebouncedText(text);
        setSuggestionsDismissed(false);
      }, 1500);
    } else {
      setDebouncedText("");
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [text, mode]);

  // Fetch related notes via semantic search
  const { data: relatedNotes, isFetching: suggestionsLoading } = trpc.notes.search.useQuery(
    { query: debouncedText, limit: 3 },
    { enabled: debouncedText.length >= 30 && mode === "text" && !suggestionsDismissed }
  );

  const showSuggestions =
    !suggestionsDismissed &&
    mode === "text" &&
    debouncedText.length >= 30 &&
    relatedNotes &&
    relatedNotes.length > 0;

  // Detect support once on mount (client-only)
  useEffect(() => {
    setSpeechSupported(
      typeof window !== "undefined" &&
        ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
    );
  }, []);

  const createNote = trpc.notes.create.useMutation({
    onSuccess: () => {
      setText("");
      setUrl("");
      setManualTags([]);
      setDebouncedTagText("");
      setTagsDismissed(false);
    },
  });

  async function handleSubmit() {
    if (mode === "text" && !text.trim()) return;
    if (mode === "link" && !url.trim()) return;

    createNote.mutate({
      content: text,
      url: mode === "link" ? url : undefined,
      type: mode === "link" ? "link" : "text",
    });
  }

  function toggleRecording() {
    if (isRecording) {
      recognitionRef.current?.stop();
      // state is set in onend handler
      return;
    }

    const SpeechRecognitionImpl =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionImpl();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let finalText = "";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      setLiveTranscript(finalText + interim);
    };

    recognition.onend = () => {
      setIsRecording(false);
      if (finalText.trim()) {
        setText((prev) => (prev ? prev + " " + finalText.trim() : finalText.trim()));
      }
      setLiveTranscript("");
      recognitionRef.current = null;
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("SpeechRecognition error:", event.error);
      setIsRecording(false);
      setLiveTranscript("");
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    setLiveTranscript("");
  }

  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Mode tabs */}
      <div style={{ display: "flex", gap: 4 }}>
        {(["text", "link", "voice"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 10px",
              borderRadius: 6,
              fontSize: 13,
              border: "none",
              cursor: "pointer",
              background: mode === m ? "var(--color-surface-2)" : "transparent",
              color: mode === m ? "var(--color-text)" : "var(--color-text-muted)",
              transition: "all 0.15s",
            }}
          >
            {m === "text" && <FileText size={13} />}
            {m === "link" && <Link2 size={13} />}
            {m === "voice" && <Mic size={13} />}
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      {/* Input area */}
      {mode === "text" && (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Capture a thought, idea, or note..."
          rows={4}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
          }}
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            outline: "none",
            resize: "none",
            color: "var(--color-text)",
            fontSize: 15,
            lineHeight: 1.6,
            fontFamily: "inherit",
          }}
        />
      )}

      {/* Smart suggestions panel */}
      {showSuggestions && (
        <div
          style={{
            background: "var(--color-surface-2)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 4,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--color-text-muted)",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              Related Notes
            </span>
            <button
              type="button"
              onClick={() => setSuggestionsDismissed(true)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "2px 4px",
                color: "var(--color-text-muted)",
                display: "flex",
                alignItems: "center",
              }}
              aria-label="Dismiss suggestions"
            >
              <X size={12} />
            </button>
          </div>
          {relatedNotes.map((note) => (
            <button
              key={note.id}
              type="button"
              onClick={() => router.push(`/notes/${note.id}`)}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                padding: "8px 10px",
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                textAlign: "left",
                transition: "border-color 0.15s",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--color-text)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  display: "block",
                }}
              >
                {note.source_title ?? note.content.slice(0, 60)}
              </span>
              <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                {note.type}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* AI tag suggestions */}
      {showTagSuggestions && (
        <div
          style={{
            background: "var(--color-surface-2)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            padding: "10px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Tag size={11} color="var(--color-accent)" />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--color-text-muted)",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                Suggested tags
              </span>
              {suggestTagsMutation.isPending && (
                <Loader2
                  size={10}
                  color="var(--color-text-muted)"
                  style={{ animation: "spin 1s linear infinite" }}
                />
              )}
            </div>
            <button
              type="button"
              onClick={() => setTagsDismissed(true)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "2px 4px",
                color: "var(--color-text-muted)",
                display: "flex",
                alignItems: "center",
              }}
              aria-label="Dismiss tag suggestions"
            >
              <X size={12} />
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {suggestedTags.map((tag) => {
              const isAdded = manualTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => (isAdded ? removeTag(tag) : addTag(tag))}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "3px 9px",
                    borderRadius: 20,
                    fontSize: 12,
                    border: "1px solid",
                    borderColor: isAdded ? "var(--color-accent)" : "var(--color-border)",
                    background: isAdded
                      ? "color-mix(in srgb, var(--color-accent) 12%, transparent)"
                      : "var(--color-surface)",
                    color: isAdded ? "var(--color-accent)" : "var(--color-text-muted)",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.15s",
                  }}
                >
                  {isAdded ? <X size={10} /> : <Plus size={10} />}
                  {tag}
                </button>
              );
            })}
          </div>
          {manualTags.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Added:</span>
              {manualTags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "2px 8px",
                    borderRadius: 20,
                    fontSize: 12,
                    background: "color-mix(in srgb, var(--color-accent) 15%, transparent)",
                    color: "var(--color-accent)",
                    border: "1px solid color-mix(in srgb, var(--color-accent) 30%, transparent)",
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {mode === "link" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a URL..."
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            style={{
              width: "100%",
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              padding: "8px 12px",
              color: "var(--color-text)",
              fontSize: 14,
              fontFamily: "inherit",
              outline: "none",
            }}
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a note (optional)..."
            rows={2}
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              outline: "none",
              resize: "none",
              color: "var(--color-text-muted)",
              fontSize: 14,
              lineHeight: 1.5,
              fontFamily: "inherit",
            }}
          />
        </div>
      )}

      {mode === "voice" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            padding: "16px 0",
          }}
        >
          {speechSupported === false ? (
            <div className={styles.voiceUnsupported}>
              Voice capture requires a browser that supports the Web Speech API
              (e.g. Chrome or Edge). Your current browser does not support it.
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={toggleRecording}
                disabled={speechSupported === null}
                data-recording={String(isRecording)}
                className={styles.recordBtn}
                aria-label={isRecording ? "Stop recording" : "Start recording"}
              >
                {isRecording ? (
                  <X size={24} color="white" />
                ) : (
                  <Mic size={24} color="white" />
                )}
              </button>

              <span className={styles.recordLabel}>
                {isRecording ? "Recording… tap to stop" : "Tap to start recording"}
              </span>

              {/* Live transcript preview */}
              {(isRecording || liveTranscript) && (
                <div
                  className={styles.liveTranscript}
                  data-listening={String(!!liveTranscript)}
                >
                  {liveTranscript || "Listening…"}
                </div>
              )}

              {/* Populated text ready to save */}
              {!isRecording && text.trim() && (
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={3}
                  aria-label="Voice transcript"
                  className={styles.voiceTextarea}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
          {mode === "text" && "⌘ + Enter to save"}
          {mode === "link" && "AI will extract title, summary & key points"}
          {mode === "voice" && "Transcript saved automatically"}
        </span>
        {mode !== "voice" && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={createNote.isPending || (!text.trim() && !url.trim())}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              background: "var(--color-accent)",
              color: "white",
              fontSize: 13,
              fontWeight: 500,
              opacity: createNote.isPending || (!text.trim() && !url.trim()) ? 0.5 : 1,
              transition: "opacity 0.15s",
            }}
          >
            {createNote.isPending ? (
              <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <Send size={14} />
            )}
            Save
          </button>
        )}
      </div>
    </div>
  );
}
