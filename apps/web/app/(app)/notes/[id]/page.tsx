"use client";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { supabase } from "@/lib/supabase/client";
import {
  Loader2,
  ArrowLeft,
  Edit2,
  Save,
  X,
  Archive,
  Trash2,
  ExternalLink,
  Brain,
  Tag,
  FileText,
  Link2,
  Mic,
  CheckSquare,
  Users,
  Share2,
  Copy,
  Check,
  History,
  ImageIcon,
  RotateCcw,
  ChevronRight,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useIsMobile } from "@/hooks/useIsMobile";

const typeIcons: Record<string, React.ElementType> = {
  text: FileText,
  link: Link2,
  voice: Mic,
  task: CheckSquare,
  meeting: Users,
  file: FileText,
  highlight: FileText,
};

const typeBadgeColors: Record<string, string> = {
  text: "#6366f1",
  link: "#3b82f6",
  voice: "#22c55e",
  task: "#f59e0b",
  meeting: "#ec4899",
  file: "#8b5cf6",
  highlight: "#f97316",
};

// ── Upload a file to Supabase Storage ──────────────────────────────────────
async function uploadImageToStorage(
  file: File,
  userId: string,
  noteId: string,
  onProgress: (pct: number) => void
): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${userId}/${noteId}/${Date.now()}_${safeName}`;

  onProgress(10);

  const { error } = await supabase.storage
    .from("note-images")
    .upload(path, file, { upsert: false, contentType: file.type });

  if (error) {
    if (
      error.message?.toLowerCase().includes("bucket") ||
      error.message?.toLowerCase().includes("not found")
    ) {
      throw new Error(
        'Storage bucket "note-images" not found. Create it in Supabase Dashboard → Storage → New bucket (name: note-images, public: true).'
      );
    }
    throw new Error(error.message);
  }

  onProgress(90);

  const { data: urlData } = supabase.storage
    .from("note-images")
    .getPublicUrl(path);

  onProgress(100);
  return urlData.publicUrl;
}

export default function NoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const isMobile = useIsMobile();

  const utils = trpc.useUtils();
  const { data: note, isLoading } = trpc.notes.byId.useQuery({ id });

  // ── Edit state ─────────────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // ── History panel state ────────────────────────────────────────────────────
  const [historyOpen, setHistoryOpen] = useState(false);
  const [previewVersionId, setPreviewVersionId] = useState<string | null>(null);

  // ── Image upload state ─────────────────────────────────────────────────────
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── tRPC mutations & queries ───────────────────────────────────────────────
  const update = trpc.notes.update.useMutation({
    onSuccess: () => {
      utils.notes.byId.invalidate({ id });
      utils.notes.list.invalidate();
    },
  });

  const saveVersion = trpc.notes.saveVersion.useMutation();

  const { data: versions, refetch: refetchVersions } =
    trpc.notes.listVersions.useQuery(
      { noteId: id },
      { enabled: historyOpen }
    );

  const { data: previewVersion } = trpc.notes.getVersion.useQuery(
    { versionId: previewVersionId!, noteId: id },
    { enabled: !!previewVersionId }
  );

  const restoreVersion = trpc.notes.restoreVersion.useMutation({
    onSuccess: () => {
      utils.notes.byId.invalidate({ id });
      setPreviewVersionId(null);
      setHistoryOpen(false);
      refetchVersions();
    },
  });

  const createShareLink = trpc.sharing.createShareLink.useMutation({
    onSuccess: (data) => {
      const url = `${window.location.origin}/shared/${data.token}`;
      setShareUrl(url);
    },
  });

  // ── Loading / not found ────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
        <Loader2
          size={24}
          color="var(--color-text-muted)"
          style={{ animation: "spin 1s linear infinite" }}
        />
      </div>
    );
  }

  if (!note) return null;

  const meta = (note.metadata ?? {}) as Record<string, unknown>;
  const summary = meta.summary as string | undefined;
  const keyPoints = meta.keyPoints as string[] | undefined;
  const Icon = typeIcons[note.type] ?? FileText;
  const badgeColor = typeBadgeColors[note.type] ?? "#6366f1";
  const imageUrls = (note.imageUrls ?? []) as string[];

  const displayTitle = note.sourceTitle
    ? note.sourceTitle
    : note.content.slice(0, 60) + (note.content.length > 60 ? "…" : "");

  // ── Handlers ───────────────────────────────────────────────────────────────
  function startEditing() {
    setEditContent(note!.content);
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setEditContent("");
  }

  async function saveEdit() {
    if (!note) return;
    // Auto-save current content as a version before overwriting
    await saveVersion.mutateAsync({
      noteId: note.id,
      content: note.content,
      title: note.sourceTitle ?? undefined,
    });
    update.mutate(
      { id: note.id, content: editContent },
      { onSuccess: () => setIsEditing(false) }
    );
  }

  function handleArchive() {
    update.mutate(
      { id: note!.id, status: "archived" },
      { onSuccess: () => router.push("/notes") }
    );
  }

  function handleDelete() {
    update.mutate(
      { id: note!.id, status: "deleted" },
      { onSuccess: () => router.push("/notes") }
    );
  }

  async function handleImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !note) return;

    setUploadError(null);
    setUploadProgress(0);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const publicUrl = await uploadImageToStorage(
        file,
        user.id,
        note.id,
        (pct) => setUploadProgress(pct)
      );

      const newImageUrls = [...imageUrls, publicUrl];
      await update.mutateAsync({ id: note.id, imageUrls: newImageUrls });
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeleteImage(urlToRemove: string) {
    if (!note) return;
    const newImageUrls = imageUrls.filter((u) => u !== urlToRemove);
    await update.mutateAsync({ id: note.id, imageUrls: newImageUrls });
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "1fr 320px",
      gap: 24,
      maxWidth: 1100,
      alignItems: "flex-start",
    }}>
      {/* ── Left column ────────────────────────────────────────────── */}
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Back button */}
        <button
          onClick={() => router.back()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--color-text-muted)",
            fontSize: 13,
            padding: 0,
            alignSelf: "flex-start",
          }}
        >
          <ArrowLeft size={14} /> Notes
        </button>

        {/* Title area */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <Icon size={18} color={badgeColor} />
            <span
              style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 4,
                background: `${badgeColor}20`,
                color: badgeColor,
                textTransform: "capitalize",
              }}
            >
              {note.type}
            </span>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.4 }}>{displayTitle}</h1>
          <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 }}>
            {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
          </p>
        </div>

        {/* Editable content area */}
        <div
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            padding: 20,
          }}
        >
          {/* Toolbar row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--color-text-muted)",
                letterSpacing: "0.05em",
              }}
            >
              CONTENT
            </span>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {/* History button */}
              <button
                onClick={() => {
                  setHistoryOpen((o) => !o);
                  setPreviewVersionId(null);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  background: historyOpen ? "var(--color-accent)" : "none",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  color: historyOpen ? "white" : "var(--color-text-muted)",
                  fontSize: 12,
                  padding: "4px 10px",
                }}
              >
                <History size={12} /> History
              </button>

              {/* Attach image button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadProgress !== null}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  background: "none",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-sm)",
                  cursor: uploadProgress !== null ? "not-allowed" : "pointer",
                  color: "var(--color-text-muted)",
                  fontSize: 12,
                  padding: "4px 10px",
                  opacity: uploadProgress !== null ? 0.6 : 1,
                }}
              >
                {uploadProgress !== null ? (
                  <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                ) : (
                  <ImageIcon size={12} />
                )}
                {uploadProgress !== null ? `${uploadProgress}%` : "Attach image"}
              </button>

              {/* Edit button (only when not already editing) */}
              {!isEditing && (
                <button
                  onClick={startEditing}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    background: "none",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    color: "var(--color-text-muted)",
                    fontSize: 12,
                    padding: "4px 10px",
                  }}
                >
                  <Edit2 size={12} /> Edit
                </button>
              )}
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            title="Attach image"
            aria-label="Attach image"
            style={{ display: "none" }}
            onChange={handleImageFileChange}
          />

          {/* Upload error banner */}
          {uploadError && (
            <div
              style={{
                background: "#ef44441a",
                border: "1px solid #ef4444",
                borderRadius: "var(--radius-sm)",
                padding: "8px 12px",
                fontSize: 12,
                color: "#ef4444",
                marginBottom: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 8,
              }}
            >
              <span>{uploadError}</span>
              <button
                type="button"
                title="Dismiss error"
                onClick={() => setUploadError(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#ef4444",
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                <X size={12} />
              </button>
            </div>
          )}

          {/* Upload progress bar */}
          {uploadProgress !== null && (
            <div
              style={{
                height: 4,
                background: "var(--color-border)",
                borderRadius: 2,
                marginBottom: 12,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${uploadProgress}%`,
                  background: "var(--color-accent)",
                  borderRadius: 2,
                  transition: "width 0.2s ease",
                }}
              />
            </div>
          )}

          {/* History panel */}
          {historyOpen && (
            <div
              style={{
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                background: "var(--color-surface-2)",
                marginBottom: 16,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 14px",
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--color-text-muted)",
                    letterSpacing: "0.05em",
                  }}
                >
                  VERSION HISTORY
                </span>
                <button
                  type="button"
                  title="Close history"
                  onClick={() => {
                    setHistoryOpen(false);
                    setPreviewVersionId(null);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--color-text-muted)",
                    padding: 2,
                  }}
                >
                  <X size={14} />
                </button>
              </div>

              <div style={{ display: "flex", maxHeight: 340 }}>
                {/* Version list */}
                <div
                  style={{
                    flex: "0 0 220px",
                    borderRight: previewVersionId
                      ? "1px solid var(--color-border)"
                      : "none",
                    overflowY: "auto",
                  }}
                >
                  {!versions || versions.length === 0 ? (
                    <p
                      style={{
                        padding: "16px 14px",
                        fontSize: 12,
                        color: "var(--color-text-muted)",
                        fontStyle: "italic",
                      }}
                    >
                      No saved versions yet. Versions are created automatically
                      when you save.
                    </p>
                  ) : (
                    versions.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setPreviewVersionId(v.id)}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                          gap: 2,
                          width: "100%",
                          padding: "10px 14px",
                          background:
                            previewVersionId === v.id
                              ? "var(--color-accent)18"
                              : "none",
                          border: "none",
                          borderBottom: "1px solid var(--color-border)",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            width: "100%",
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color:
                                previewVersionId === v.id
                                  ? "var(--color-accent)"
                                  : "var(--color-text)",
                            }}
                          >
                            {format(new Date(v.savedAt), "MMM d, HH:mm")}
                          </span>
                          <ChevronRight
                            size={11}
                            color={
                              previewVersionId === v.id
                                ? "var(--color-accent)"
                                : "var(--color-text-muted)"
                            }
                          />
                        </div>
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--color-text-muted)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: 180,
                          }}
                        >
                          {v.preview || "(empty)"}
                        </span>
                      </button>
                    ))
                  )}
                </div>

                {/* Version preview pane */}
                {previewVersionId && (
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      overflow: "hidden",
                    }}
                  >
                    {!previewVersion ? (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          padding: 24,
                        }}
                      >
                        <Loader2
                          size={18}
                          color="var(--color-text-muted)"
                          style={{ animation: "spin 1s linear infinite" }}
                        />
                      </div>
                    ) : (
                      <>
                        <div
                          style={{
                            flex: 1,
                            overflowY: "auto",
                            padding: "12px 14px",
                          }}
                        >
                          <p
                            style={{
                              fontSize: 13,
                              color: "var(--color-text)",
                              lineHeight: 1.7,
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                              margin: 0,
                            }}
                          >
                            {previewVersion.content}
                          </p>
                        </div>
                        <div
                          style={{
                            padding: "10px 14px",
                            borderTop: "1px solid var(--color-border)",
                            display: "flex",
                            gap: 8,
                          }}
                        >
                          <button
                            onClick={() =>
                              restoreVersion.mutate({
                                versionId: previewVersionId,
                                noteId: id,
                              })
                            }
                            disabled={restoreVersion.isPending}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                              background: "var(--color-accent)",
                              border: "none",
                              borderRadius: "var(--radius-sm)",
                              cursor: restoreVersion.isPending
                                ? "not-allowed"
                                : "pointer",
                              color: "white",
                              fontSize: 12,
                              padding: "5px 12px",
                              opacity: restoreVersion.isPending ? 0.7 : 1,
                            }}
                          >
                            {restoreVersion.isPending ? (
                              <Loader2
                                size={12}
                                style={{ animation: "spin 1s linear infinite" }}
                              />
                            ) : (
                              <RotateCcw size={12} />
                            )}
                            Restore this version
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Content (edit or view) */}
          {isEditing ? (
            <>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                aria-label="Edit note content"
                rows={10}
                style={{
                  width: "100%",
                  background: "var(--color-surface-2)",
                  border: "1px solid var(--color-accent)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--color-text)",
                  fontSize: 14,
                  lineHeight: 1.6,
                  padding: "10px 14px",
                  resize: "vertical",
                  fontFamily: "inherit",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button
                  onClick={saveEdit}
                  disabled={update.isPending || saveVersion.isPending}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    background: "var(--color-accent)",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    cursor:
                      update.isPending || saveVersion.isPending
                        ? "not-allowed"
                        : "pointer",
                    color: "white",
                    fontSize: 13,
                    padding: "6px 14px",
                    opacity:
                      update.isPending || saveVersion.isPending ? 0.7 : 1,
                  }}
                >
                  {update.isPending || saveVersion.isPending ? (
                    <Loader2
                      size={13}
                      style={{ animation: "spin 1s linear infinite" }}
                    />
                  ) : (
                    <Save size={13} />
                  )}
                  Save
                </button>
                <button
                  onClick={cancelEditing}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    background: "none",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    color: "var(--color-text-muted)",
                    fontSize: 13,
                    padding: "6px 14px",
                  }}
                >
                  <X size={13} /> Cancel
                </button>
              </div>
            </>
          ) : (
            <p
              style={{
                fontSize: 14,
                color: "var(--color-text)",
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {note.content}
            </p>
          )}
        </div>

        {/* Image attachments grid (shown in both edit and view modes) */}
        {imageUrls.length > 0 && (
          <div
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              padding: 20,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--color-text-muted)",
                letterSpacing: "0.05em",
                display: "block",
                marginBottom: 12,
              }}
            >
              ATTACHMENTS ({imageUrls.length})
            </span>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: 10,
              }}
            >
              {imageUrls.map((url) => (
                <div
                  key={url}
                  style={{
                    position: "relative",
                    borderRadius: "var(--radius-sm)",
                    overflow: "hidden",
                    aspectRatio: "1",
                    background: "var(--color-surface-2)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <img
                    src={url}
                    alt="Attached image"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                  {/* Delete button */}
                  <button
                    onClick={() => handleDeleteImage(url)}
                    disabled={update.isPending}
                    style={{
                      position: "absolute",
                      top: 5,
                      right: 5,
                      background: "rgba(0,0,0,0.65)",
                      border: "none",
                      borderRadius: "50%",
                      width: 22,
                      height: 22,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: update.isPending ? "not-allowed" : "pointer",
                      color: "white",
                      padding: 0,
                    }}
                    title="Remove image"
                  >
                    <X size={11} />
                  </button>
                  {/* Open full size link */}
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      position: "absolute",
                      bottom: 5,
                      right: 5,
                      background: "rgba(0,0,0,0.65)",
                      borderRadius: 4,
                      width: 22,
                      height: 22,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      textDecoration: "none",
                    }}
                    title="Open full size"
                  >
                    <ExternalLink size={11} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Source URL */}
        {note.sourceUrl && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              padding: "12px 16px",
            }}
          >
            <ExternalLink size={14} color="var(--color-text-muted)" />
            <a
              href={note.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 13,
                color: "var(--color-accent)",
                textDecoration: "none",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {note.sourceUrl}
            </a>
          </div>
        )}
      </div>

      {/* ── Right column ────────────────────────────────────────────── */}
      <div
        style={{
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* AI Summary */}
        <div
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            padding: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              marginBottom: 10,
            }}
          >
            <Brain size={14} color="var(--color-accent)" />
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--color-text-muted)",
                letterSpacing: "0.05em",
              }}
            >
              AI SUMMARY
            </span>
          </div>
          {summary ? (
            <p style={{ fontSize: 13, color: "var(--color-text)", lineHeight: 1.6 }}>
              {summary}
            </p>
          ) : (
            <p
              style={{
                fontSize: 13,
                color: "var(--color-text-muted)",
                fontStyle: "italic",
              }}
            >
              Processing…
            </p>
          )}
        </div>

        {/* Key Points */}
        {keyPoints && keyPoints.length > 0 && (
          <div
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              padding: 16,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--color-text-muted)",
                letterSpacing: "0.05em",
                display: "block",
                marginBottom: 10,
              }}
            >
              KEY POINTS
            </span>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {keyPoints.map((point, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 7,
                    fontSize: 13,
                    color: "var(--color-text)",
                    lineHeight: 1.5,
                  }}
                >
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: "var(--color-accent)",
                      marginTop: 7,
                      flexShrink: 0,
                    }}
                  />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tags */}
        <div
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            padding: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              marginBottom: 10,
            }}
          >
            <Tag size={14} color="var(--color-text-muted)" />
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--color-text-muted)",
                letterSpacing: "0.05em",
              }}
            >
              TAGS
            </span>
          </div>
          <p
            style={{
              fontSize: 12,
              color: "var(--color-text-muted)",
              fontStyle: "italic",
            }}
          >
            (tags coming soon)
          </p>
        </div>

        {/* Share */}
        <div
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            padding: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              marginBottom: 10,
            }}
          >
            <Share2 size={14} color="var(--color-text-muted)" />
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--color-text-muted)",
                letterSpacing: "0.05em",
              }}
            >
              SHARE
            </span>
          </div>

          {shareUrl ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "var(--color-surface-2)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "6px 10px",
                }}
              >
                <input
                  readOnly
                  value={shareUrl}
                  title="Share URL"
                  style={{
                    flex: 1,
                    background: "none",
                    border: "none",
                    outline: "none",
                    color: "var(--color-text)",
                    fontSize: 11,
                    fontFamily: "monospace",
                    minWidth: 0,
                  }}
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl).then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    });
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: copied ? "#22c55e" : "var(--color-text-muted)",
                    display: "flex",
                    alignItems: "center",
                    flexShrink: 0,
                    padding: 2,
                  }}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                </button>
              </div>
              <p style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                {copied ? "Copied!" : "Anyone with this link can view the note."}
              </p>
            </div>
          ) : (
            <button
              onClick={() => createShareLink.mutate({ noteId: note.id })}
              disabled={createShareLink.isPending}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                background: "none",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                cursor: createShareLink.isPending ? "not-allowed" : "pointer",
                color: "var(--color-text-muted)",
                fontSize: 13,
                padding: "9px 14px",
                width: "100%",
                opacity: createShareLink.isPending ? 0.6 : 1,
                transition: "border-color 0.15s, color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--color-accent)";
                e.currentTarget.style.color = "var(--color-accent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--color-border)";
                e.currentTarget.style.color = "var(--color-text-muted)";
              }}
            >
              {createShareLink.isPending ? (
                <Loader2
                  size={13}
                  style={{ animation: "spin 1s linear infinite" }}
                />
              ) : (
                <Share2 size={13} />
              )}
              Create share link
            </button>
          )}
        </div>

        {/* Archive & Delete */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={handleArchive}
            disabled={update.isPending}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              background: "none",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              cursor: update.isPending ? "not-allowed" : "pointer",
              color: "var(--color-text-muted)",
              fontSize: 13,
              padding: "9px 14px",
              transition: "border-color 0.15s, color 0.15s",
              opacity: update.isPending ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--color-accent)";
              e.currentTarget.style.color = "var(--color-accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--color-border)";
              e.currentTarget.style.color = "var(--color-text-muted)";
            }}
          >
            <Archive size={13} /> Archive note
          </button>

          <button
            onClick={handleDelete}
            disabled={update.isPending}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              background: "none",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              cursor: update.isPending ? "not-allowed" : "pointer",
              color: "var(--color-text-muted)",
              fontSize: 13,
              padding: "9px 14px",
              transition: "border-color 0.15s, color 0.15s",
              opacity: update.isPending ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#ef4444";
              e.currentTarget.style.color = "#ef4444";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--color-border)";
              e.currentTarget.style.color = "var(--color-text-muted)";
            }}
          >
            <Trash2 size={13} /> Delete note
          </button>
        </div>
      </div>
    </div>
  );
}
