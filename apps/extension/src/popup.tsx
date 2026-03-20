import { useState, useEffect } from "react";

interface SaveState { status: "idle" | "saving" | "saved" | "error"; message?: string; }

export default function Popup() {
  const [note, setNote] = useState("");
  const [pageInfo, setPageInfo] = useState<{ url: string; title: string } | null>(null);
  const [mode, setMode] = useState<"note" | "clip">("clip");
  const [save, setSave] = useState<SaveState>({ status: "idle" });
  const [apiUrl, setApiUrl] = useState("");

  useEffect(() => {
    chrome.storage.local.get("apiUrl", (r) => setApiUrl(r.apiUrl ?? "http://localhost:3000"));
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.url && tab?.title) setPageInfo({ url: tab.url, title: tab.title });
    });
  }, []);

  async function handleSave() {
    setSave({ status: "saving" });
    try {
      const body = mode === "clip" && pageInfo
        ? { url: pageInfo.url, content: note, type: "link" }
        : { content: note, type: "text" };

      const res = await fetch(`${apiUrl}/api/trpc/notes.create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ json: body }),
      });

      if (!res.ok) throw new Error("Failed to save");
      setSave({ status: "saved" });
      setNote("");
      setTimeout(() => setSave({ status: "idle" }), 2000);
    } catch (e) {
      setSave({ status: "error", message: "Make sure Second Brain is running and you're logged in." });
    }
  }

  const s: Record<string, React.CSSProperties> = {
    root: { width: 340, padding: 16, fontFamily: "system-ui, sans-serif", background: "#0a0a0a", color: "#f0f0f0", minHeight: 200 },
    header: { display: "flex", alignItems: "center", gap: 8, marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid #2a2a2a" },
    tabs: { display: "flex", gap: 4, marginBottom: 12 },
    tab: (active: boolean) => ({ padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, background: active ? "#6366f1" : "transparent", color: active ? "white" : "#888" }),
    input: { width: "100%", background: "#111", border: "1px solid #2a2a2a", borderRadius: 8, padding: "8px 10px", color: "#f0f0f0", fontSize: 13, resize: "none", outline: "none", fontFamily: "inherit", boxSizing: "border-box" },
    pageCard: { background: "#111", border: "1px solid #2a2a2a", borderRadius: 8, padding: "8px 10px", marginBottom: 10 },
    btn: (disabled: boolean) => ({ width: "100%", padding: "9px", borderRadius: 8, border: "none", cursor: disabled ? "not-allowed" : "pointer", background: save.status === "saved" ? "#22c55e" : "#6366f1", color: "white", fontSize: 13, fontWeight: 600, opacity: disabled ? 0.6 : 1 }),
  };

  return (
    <div style={s.root}>
      <div style={s.header}>
        <span style={{ fontSize: 16 }}>⚡</span>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Second Brain</span>
      </div>

      <div style={s.tabs}>
        {(["clip", "note"] as const).map((m) => (
          <button key={m} style={s.tab(mode === m)} onClick={() => setMode(m)}>
            {m === "clip" ? "📎 Clip page" : "✏️ Quick note"}
          </button>
        ))}
      </div>

      {mode === "clip" && pageInfo && (
        <div style={s.pageCard}>
          <p style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>{new URL(pageInfo.url).hostname}</p>
          <p style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pageInfo.title}</p>
        </div>
      )}

      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
        placeholder={mode === "clip" ? "Add a note (optional)..." : "What's on your mind?"}
        style={s.input} />

      {save.status === "error" && (
        <p style={{ fontSize: 11, color: "#ef4444", marginTop: 6 }}>{save.message}</p>
      )}

      <button onClick={handleSave} disabled={save.status === "saving" || (mode === "note" && !note.trim())}
        style={{ ...s.btn(save.status === "saving" || (mode === "note" && !note.trim())), marginTop: 10 }}>
        {save.status === "saving" ? "Saving..." : save.status === "saved" ? "✓ Saved!" : "Save to Second Brain"}
      </button>
    </div>
  );
}
