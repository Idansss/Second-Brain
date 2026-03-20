"use client";

import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc/client";
import { Upload, CheckCircle, XCircle, Loader2 } from "lucide-react";

type Tab = "notion" | "obsidian" | "readwise";
type NoteType = "text" | "link" | "voice" | "task" | "meeting" | "file" | "highlight";

interface FileResult {
  name: string;
  status: "pending" | "importing" | "done" | "error";
  count?: number;
  error?: string;
}

function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

function splitNotionSections(markdown: string): string[] {
  // Split on top-level headings, keep each section as a note
  const sections = markdown.split(/^(?=# )/m).filter((s) => s.trim().length > 0);
  // If no top-level headings, fall back to the whole file
  return sections.length > 0 ? sections : [markdown];
}

function parseReadwiseCsv(csv: string): Array<{ content: string; url?: string }> {
  const lines = csv.split("\n").filter((l) => l.trim());
  if (lines.length <= 1) return [];

  // Try to detect header columns
  const header = lines[0]!.split(",").map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ""));
  const highlightIdx = header.findIndex((h) => h.includes("highlight") || h.includes("text") || h.includes("content") || h.includes("quote"));
  const urlIdx = header.findIndex((h) => h.includes("url") || h.includes("link") || h.includes("source"));

  const results: Array<{ content: string; url?: string }> = [];

  for (let i = 1; i < lines.length; i++) {
    // Simple CSV parse: split by comma but respect quoted fields
    const row = lines[i]!;
    const cols: string[] = [];
    let inQuotes = false;
    let current = "";
    for (const ch of row) {
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        cols.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    cols.push(current.trim());

    const content = highlightIdx >= 0 ? (cols[highlightIdx] ?? "").replace(/^"|"$/g, "") : cols[0] ?? "";
    const url = urlIdx >= 0 ? (cols[urlIdx] ?? "").replace(/^"|"$/g, "") : undefined;

    if (content.trim().length > 0) {
      results.push({ content: content.trim(), url: url?.trim() || undefined });
    }
  }

  return results;
}

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState<Tab>("notion");
  const [results, setResults] = useState<FileResult[]>([]);
  const notionInputRef = useRef<HTMLInputElement>(null);
  const obsidianInputRef = useRef<HTMLInputElement>(null);
  const readwiseInputRef = useRef<HTMLInputElement>(null);

  const createNote = trpc.notes.create.useMutation();

  async function importFiles(files: FileList | null, type: NoteType, parser: (text: string, name: string) => Array<{ content: string; url?: string; type?: NoteType }>) {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const initial: FileResult[] = fileArray.map((f) => ({ name: f.name, status: "pending" }));
    setResults(initial);

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i]!;

      setResults((prev) =>
        prev.map((r, idx) => (idx === i ? { ...r, status: "importing" } : r))
      );

      try {
        const text = await readFileText(file);
        const parsed = parser(text, file.name);

        let count = 0;
        for (const item of parsed) {
          await createNote.mutateAsync({
            content: item.content,
            type: item.type ?? type,
            ...(item.url ? { url: item.url } : {}),
          });
          count++;
        }

        setResults((prev) =>
          prev.map((r, idx) => (idx === i ? { ...r, status: "done", count } : r))
        );
      } catch (err) {
        setResults((prev) =>
          prev.map((r, idx) =>
            idx === i ? { ...r, status: "error", error: (err as Error).message } : r
          )
        );
      }
    }
  }

  function handleNotion(e: React.ChangeEvent<HTMLInputElement>) {
    importFiles(e.target.files, "text", (text) => splitNotionSections(text).map((s) => ({ content: s, type: "text" as NoteType })));
  }

  function handleObsidian(e: React.ChangeEvent<HTMLInputElement>) {
    importFiles(e.target.files, "text", (text) => [{ content: text, type: "text" as NoteType }]);
  }

  function handleReadwise(e: React.ChangeEvent<HTMLInputElement>) {
    importFiles(e.target.files, "highlight", (text) =>
      parseReadwiseCsv(text).map((item) => ({ ...item, type: "highlight" as NoteType }))
    );
  }

  const tabs: Array<{ key: Tab; label: string; emoji: string }> = [
    { key: "notion", label: "Notion", emoji: "📄" },
    { key: "obsidian", label: "Obsidian", emoji: "🔮" },
    { key: "readwise", label: "Readwise", emoji: "📚" },
  ];

  return (
    <div style={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Import Notes</h1>
        <p style={{ fontSize: 14, color: "var(--color-text-muted)" }}>
          Bring your existing notes from Notion, Obsidian, or Readwise into your second brain.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: "var(--color-surface)", borderRadius: 10, padding: 4, width: "fit-content" }}>
        {tabs.map(({ key, label, emoji }) => (
          <button
            key={key}
            onClick={() => { setActiveTab(key); setResults([]); }}
            style={{
              padding: "7px 16px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: activeTab === key ? 600 : 400,
              background: activeTab === key ? "var(--color-surface-2)" : "transparent",
              color: activeTab === key ? "var(--color-text)" : "var(--color-text-muted)",
              transition: "all 0.15s",
              fontFamily: "inherit",
            }}
          >
            {emoji} {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>

        {activeTab === "notion" && (
          <>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Import from Notion</p>
              <p style={{ fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                Export a Notion page as Markdown &amp; CSV (Settings → Export). Each top-level heading becomes a separate note.
              </p>
            </div>
            <DropZone
              accept=".md,.markdown,.txt"
              label="Drop your Notion .md export here"
              inputRef={notionInputRef}
              onChange={handleNotion}
              multiple={false}
            />
          </>
        )}

        {activeTab === "obsidian" && (
          <>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Import from Obsidian</p>
              <p style={{ fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                Select one or more .md files from your Obsidian vault. Each file becomes a note.
              </p>
            </div>
            <DropZone
              accept=".md,.markdown,.txt"
              label="Drop your Obsidian .md files here"
              inputRef={obsidianInputRef}
              onChange={handleObsidian}
              multiple={true}
            />
          </>
        )}

        {activeTab === "readwise" && (
          <>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Import from Readwise</p>
              <p style={{ fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                Export your highlights from Readwise (Account → Export → CSV). Each highlight becomes a note of type &ldquo;highlight&rdquo;.
              </p>
            </div>
            <DropZone
              accept=".csv"
              label="Drop your Readwise CSV export here"
              inputRef={readwiseInputRef}
              onChange={handleReadwise}
              multiple={false}
            />
          </>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Import Progress</p>
          {results.map((r) => (
            <div
              key={r.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 14px",
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
              }}
            >
              {r.status === "pending" && <div style={{ width: 16, height: 16, borderRadius: "50%", background: "var(--color-border)" }} />}
              {r.status === "importing" && <Loader2 size={16} style={{ animation: "spin 1s linear infinite", color: "var(--color-accent)" }} />}
              {r.status === "done" && <CheckCircle size={16} color="#22c55e" />}
              {r.status === "error" && <XCircle size={16} color="#ef4444" />}

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</p>
                {r.status === "importing" && <p style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Importing...</p>}
                {r.status === "done" && <p style={{ fontSize: 12, color: "#22c55e" }}>Imported {r.count} note{r.count !== 1 ? "s" : ""}</p>}
                {r.status === "error" && <p style={{ fontSize: 12, color: "#ef4444" }}>{r.error}</p>}
              </div>
            </div>
          ))}

          {results.every((r) => r.status === "done" || r.status === "error") && (
            <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
              <a
                href="/notes"
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  background: "var(--color-accent)",
                  color: "white",
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                View Notes →
              </a>
              <button
                onClick={() => setResults([])}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  background: "transparent",
                  color: "var(--color-text-muted)",
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Import more
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DropZone({
  accept,
  label,
  inputRef,
  onChange,
  multiple,
}: {
  accept: string;
  label: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  multiple: boolean;
}) {
  const [dragging, setDragging] = useState(false);

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const dt = e.dataTransfer;
        if (inputRef.current && dt.files.length > 0) {
          // Trigger onChange manually by updating the input
          const changeEvent = { target: { files: dt.files } } as React.ChangeEvent<HTMLInputElement>;
          onChange(changeEvent);
        }
      }}
      style={{
        border: `2px dashed ${dragging ? "var(--color-accent)" : "var(--color-border)"}`,
        borderRadius: 10,
        padding: "32px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        cursor: "pointer",
        transition: "all 0.15s",
        background: dragging ? "color-mix(in srgb, var(--color-accent) 5%, transparent)" : "transparent",
      }}
    >
      <Upload size={24} color="var(--color-text-muted)" />
      <p style={{ fontSize: 14, color: "var(--color-text-muted)", textAlign: "center" }}>{label}</p>
      <p style={{ fontSize: 12, color: "var(--color-text-muted)", opacity: 0.7 }}>or click to browse</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={onChange}
        style={{ display: "none" }}
      />
    </div>
  );
}
