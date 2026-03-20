"use client";

import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc/client";
import { NoteCard } from "@/components/notes/NoteCard";
import {
  Loader2,
  Trash2,
  Plus,
  FolderOpen,
  X,
  Check,
  ChevronRight,
  ChevronDown,
  FolderPlus,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type Collection = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  emoji: string | null;
  parentId: string | null;
  noteCount: number;
  createdAt: Date;
  updatedAt: Date;
};

// ── Tree helpers ──────────────────────────────────────────────────────────────
function buildTree(
  collections: Collection[],
  parentId: string | null = null
): Collection[] {
  return collections.filter((c) => c.parentId === parentId);
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface CollectionNodeProps {
  collection: Collection;
  allCollections: Collection[];
  selectedId: string | null;
  dragOverId: string | null;
  depth: number;
  onSelect: (id: string) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
  onAddChild: (parentId: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, targetCollectionId: string) => void;
}

function CollectionNode({
  collection,
  allCollections,
  selectedId,
  dragOverId,
  depth,
  onSelect,
  onDelete,
  onAddChild,
  onDragOver,
  onDragLeave,
  onDrop,
}: CollectionNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const children = buildTree(allCollections, collection.id);
  const hasChildren = children.length > 0;
  const isActive = selectedId === collection.id;
  const isDragOver = dragOverId === collection.id;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div
        onClick={() => onSelect(collection.id)}
        onDragOver={(e) => onDragOver(e, collection.id)}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, collection.id)}
        style={{
          marginLeft: depth * 18,
          background: isDragOver
            ? "rgba(var(--color-accent-rgb, 99,102,241), 0.12)"
            : isActive
            ? "var(--color-surface-2)"
            : "var(--color-surface)",
          border: `1px solid ${
            isDragOver
              ? "var(--color-accent)"
              : isActive
              ? "var(--color-accent)"
              : "var(--color-border)"
          }`,
          borderRadius: 10,
          padding: "10px 12px",
          cursor: "pointer",
          transition: "all 0.15s",
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
        }}
        onMouseEnter={(e) => {
          if (!isActive && !isDragOver)
            e.currentTarget.style.borderColor = "var(--color-accent)";
        }}
        onMouseLeave={(e) => {
          if (!isActive && !isDragOver)
            e.currentTarget.style.borderColor = "var(--color-border)";
        }}
      >
        {/* Expand/collapse toggle */}
        <button
          type="button"
          aria-label={expanded ? "Collapse" : "Expand"}
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) setExpanded((v) => !v);
          }}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: hasChildren ? "pointer" : "default",
            color: hasChildren ? "var(--color-text-muted)" : "transparent",
            flexShrink: 0,
            marginTop: 1,
            display: "flex",
            alignItems: "center",
          }}
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown size={13} />
            ) : (
              <ChevronRight size={13} />
            )
          ) : (
            <ChevronRight size={13} style={{ opacity: 0 }} />
          )}
        </button>

        {/* Emoji */}
        <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>
          {collection.emoji || "📁"}
        </span>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {collection.name}
          </p>
          {collection.description && (
            <p
              style={{
                fontSize: 11,
                color: "var(--color-text-muted)",
                marginTop: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {collection.description}
            </p>
          )}
          <span
            style={{
              fontSize: 10,
              color: "var(--color-text-muted)",
              marginTop: 2,
              display: "block",
            }}
          >
            {collection.noteCount} {collection.noteCount === 1 ? "note" : "notes"}
          </span>
        </div>

        {/* Action buttons */}
        <div
          style={{ display: "flex", gap: 2, flexShrink: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => onAddChild(collection.id)}
            title="Add sub-collection"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-text-muted)",
              padding: 2,
              opacity: 0.5,
              transition: "opacity 0.15s",
              display: "flex",
              alignItems: "center",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.opacity = "1")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.opacity = "0.5")
            }
          >
            <FolderPlus size={12} />
          </button>
          <button
            type="button"
            onClick={(e) => onDelete(e, collection.id)}
            title="Delete collection"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-text-muted)",
              padding: 2,
              opacity: 0.5,
              transition: "opacity 0.15s",
              display: "flex",
              alignItems: "center",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.opacity = "1")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.opacity = "0.5")
            }
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {children.map((child) => (
            <CollectionNode
              key={child.id}
              collection={child}
              allCollections={allCollections}
              selectedId={selectedId}
              dragOverId={dragOverId}
              depth={depth + 1}
              onSelect={onSelect}
              onDelete={onDelete}
              onAddChild={onAddChild}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CollectionsPage() {
  const utils = trpc.useUtils();

  // ── State ────────────────────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newEmoji, setNewEmoji] = useState("");
  const [newParentId, setNewParentId] = useState<string | null>(null);

  // drag-and-drop state
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragNoteId = useRef<string | null>(null);
  const dragSourceCollectionId = useRef<string | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: collections, isLoading } = trpc.collections.list.useQuery();

  const { data: collectionNotes, isLoading: notesLoading } =
    trpc.collections.notes.useQuery(
      { collectionId: selectedId! },
      { enabled: !!selectedId }
    );

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createCollection = trpc.collections.create.useMutation({
    onSuccess: () => {
      utils.collections.list.invalidate();
      setShowCreateForm(false);
      setNewName("");
      setNewDescription("");
      setNewEmoji("");
      setNewParentId(null);
    },
  });

  const deleteCollection = trpc.collections.delete.useMutation({
    onSuccess: (_, variables) => {
      utils.collections.list.invalidate();
      if (selectedId === variables.id) setSelectedId(null);
    },
  });

  const addNote = trpc.collections.addNote.useMutation({
    onSuccess: () => {
      utils.collections.list.invalidate();
      if (selectedId) utils.collections.notes.invalidate({ collectionId: selectedId });
    },
  });

  const removeNote = trpc.collections.removeNote.useMutation({
    onSuccess: () => {
      utils.collections.list.invalidate();
      if (selectedId) utils.collections.notes.invalidate({ collectionId: selectedId });
    },
  });

  // ── Derived ───────────────────────────────────────────────────────────────
  const selectedCollection = collections?.find((c) => c.id === selectedId);
  const rootCollections = collections ? buildTree(collections as Collection[], null) : [];

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    createCollection.mutate({
      name: newName.trim(),
      description: newDescription.trim() || undefined,
      emoji: newEmoji.trim() || undefined,
      parentId: newParentId ?? undefined,
    });
  }

  function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    deleteCollection.mutate({ id });
  }

  function handleAddChild(parentId: string) {
    setNewParentId(parentId);
    setShowCreateForm(true);
  }

  function handleSelect(id: string) {
    setSelectedId((prev) => (prev === id ? null : id));
  }

  // Drag handlers for note cards
  function handleNoteDragStart(noteId: string, sourceCollectionId: string) {
    dragNoteId.current = noteId;
    dragSourceCollectionId.current = sourceCollectionId;
  }

  function handleDragOver(e: React.DragEvent, collectionId: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverId(collectionId);
  }

  function handleDragLeave() {
    setDragOverId(null);
  }

  async function handleDrop(e: React.DragEvent, targetCollectionId: string) {
    e.preventDefault();
    setDragOverId(null);
    const noteId = dragNoteId.current;
    const sourceId = dragSourceCollectionId.current;
    if (!noteId || !targetCollectionId) return;
    if (sourceId === targetCollectionId) return;

    // Add to target
    await addNote.mutateAsync({ collectionId: targetCollectionId, noteId });
    // Remove from source if it came from one
    if (sourceId) {
      await removeNote.mutateAsync({ collectionId: sourceId, noteId });
    }

    dragNoteId.current = null;
    dragSourceCollectionId.current = null;
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", gap: 24, height: "100%", minHeight: 0 }}>
      {/* ── Left column: collection tree ──────────────────────────────────── */}
      <div
        style={{
          width: 300,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {/* Header row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
              Collections
            </h1>
            <p
              style={{
                fontSize: 13,
                color: "var(--color-text-muted)",
                marginTop: 3,
              }}
            >
              {collections?.length ?? 0} collection
              {collections?.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setNewParentId(null);
              setShowCreateForm((v) => !v);
            }}
            title="New Collection"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid var(--color-border)",
              background: showCreateForm
                ? "var(--color-accent)"
                : "var(--color-surface-2)",
              color: showCreateForm ? "white" : "var(--color-text)",
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {showCreateForm ? <X size={14} /> : <Plus size={14} />}
            {showCreateForm ? "Cancel" : "New"}
          </button>
        </div>

        {/* Inline create form */}
        {showCreateForm && (
          <form
            onSubmit={handleCreate}
            style={{
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              borderRadius: 10,
              padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {/* Parent indicator */}
            {newParentId && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  color: "var(--color-text-muted)",
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 6,
                  padding: "4px 8px",
                }}
              >
                <FolderPlus size={12} />
                Sub-collection of:{" "}
                <strong style={{ color: "var(--color-text)" }}>
                  {collections?.find((c) => c.id === newParentId)?.name}
                </strong>
                <button
                  type="button"
                  title="Clear parent collection"
                  onClick={() => setNewParentId(null)}
                  style={{
                    marginLeft: "auto",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--color-text-muted)",
                    padding: 0,
                    display: "flex",
                  }}
                >
                  <X size={11} />
                </button>
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                placeholder="Emoji"
                value={newEmoji}
                onChange={(e) => setNewEmoji(e.target.value)}
                maxLength={4}
                style={{
                  width: 56,
                  padding: "7px 8px",
                  borderRadius: 7,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                  color: "var(--color-text)",
                  fontSize: 16,
                  textAlign: "center",
                }}
              />
              <input
                type="text"
                placeholder="Collection name *"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                autoFocus
                style={{
                  flex: 1,
                  padding: "7px 10px",
                  borderRadius: 7,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                  color: "var(--color-text)",
                  fontSize: 13,
                }}
              />
            </div>

            {/* Parent selector (only when not already set by clicking a collection) */}
            {!newParentId && collections && collections.length > 0 && (
              <select
                title="Parent collection"
                value={newParentId ?? ""}
                onChange={(e) => setNewParentId(e.target.value || null)}
                style={{
                  padding: "7px 10px",
                  borderRadius: 7,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                  color: "var(--color-text)",
                  fontSize: 13,
                }}
              >
                <option value="">No parent (root collection)</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji || "📁"} {c.name}
                  </option>
                ))}
              </select>
            )}

            <input
              type="text"
              placeholder="Description (optional)"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              style={{
                padding: "7px 10px",
                borderRadius: 7,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                color: "var(--color-text)",
                fontSize: 13,
              }}
            />
            <button
              type="submit"
              disabled={!newName.trim() || createCollection.isPending}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "7px 12px",
                borderRadius: 7,
                border: "none",
                background: "var(--color-accent)",
                color: "white",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                opacity:
                  !newName.trim() || createCollection.isPending ? 0.6 : 1,
              }}
            >
              {createCollection.isPending ? (
                <Loader2
                  size={13}
                  style={{ animation: "spin 1s linear infinite" }}
                />
              ) : (
                <Check size={13} />
              )}
              {newParentId ? "Create Sub-collection" : "Create Collection"}
            </button>
          </form>
        )}

        {/* Loading state */}
        {isLoading && (
          <div
            style={{ display: "flex", justifyContent: "center", paddingTop: 40 }}
          >
            <Loader2
              size={22}
              color="var(--color-text-muted)"
              style={{ animation: "spin 1s linear infinite" }}
            />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !collections?.length && !showCreateForm && (
          <div
            style={{
              textAlign: "center",
              paddingTop: 40,
              color: "var(--color-text-muted)",
            }}
          >
            <FolderOpen size={32} style={{ marginBottom: 10, opacity: 0.4 }} />
            <p style={{ fontSize: 14 }}>No collections yet.</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>
              Create one to organise your notes.
            </p>
          </div>
        )}

        {/* Collection tree */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            overflowY: "auto",
          }}
        >
          {rootCollections.map((col) => (
            <CollectionNode
              key={col.id}
              collection={col as Collection}
              allCollections={(collections ?? []) as Collection[]}
              selectedId={selectedId}
              dragOverId={dragOverId}
              depth={0}
              onSelect={handleSelect}
              onDelete={handleDelete}
              onAddChild={handleAddChild}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            />
          ))}
        </div>
      </div>

      {/* ── Divider ───────────────────────────────────────────────────────── */}
      <div
        style={{
          width: 1,
          background: "var(--color-border)",
          flexShrink: 0,
        }}
      />

      {/* ── Right column: notes in selected collection ─────────────────────── */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {!selectedId && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: 12,
              color: "var(--color-text-muted)",
            }}
          >
            <FolderOpen size={40} style={{ opacity: 0.3 }} />
            <p style={{ fontSize: 15 }}>
              Select a collection to view its notes
            </p>
            <p style={{ fontSize: 12, opacity: 0.7 }}>
              Drag notes between collections to reorganise them
            </p>
          </div>
        )}

        {selectedId && (
          <>
            {/* Collection header */}
            <div>
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 22 }}>
                  {selectedCollection?.emoji || "📁"}
                </span>
                {selectedCollection?.name}
              </h2>
              {selectedCollection?.description && (
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--color-text-muted)",
                    marginTop: 4,
                  }}
                >
                  {selectedCollection.description}
                </p>
              )}
            </div>

            {/* Notes loading */}
            {notesLoading && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  paddingTop: 40,
                }}
              >
                <Loader2
                  size={22}
                  color="var(--color-text-muted)"
                  style={{ animation: "spin 1s linear infinite" }}
                />
              </div>
            )}

            {/* Notes empty */}
            {!notesLoading && !collectionNotes?.length && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingTop: 60,
                  gap: 8,
                  color: "var(--color-text-muted)",
                }}
              >
                <p style={{ fontSize: 14 }}>No notes in this collection yet.</p>
                <p style={{ fontSize: 12 }}>
                  Use the note options to add notes here, or drag them from
                  another collection.
                </p>
              </div>
            )}

            {/* Notes list — draggable */}
            {!notesLoading && !!collectionNotes?.length && (
              <div style={{ columns: "2 280px", gap: 12 }}>
                {collectionNotes.map((note) => (
                  <div
                    key={note.id}
                    draggable
                    onDragStart={() =>
                      handleNoteDragStart(note.id, selectedId)
                    }
                    style={{
                      breakInside: "avoid",
                      marginBottom: 12,
                      cursor: "grab",
                    }}
                  >
                    <NoteCard note={note} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
