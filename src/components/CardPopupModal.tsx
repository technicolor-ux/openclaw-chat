import { useState, useCallback } from "react";
import {
  IconX,
  IconMessageCircle,
  IconEdit,
  IconArchive,
  IconTrash,
} from "@tabler/icons-react";
import {
  updateKanbanItem,
  deleteKanbanItem,
  createThread,
  type KanbanItem,
  type Project,
  type Thread,
} from "../lib/tauri";

interface Props {
  card: KanbanItem;
  projects: Project[];
  onClose: () => void;
  onUpdate: (card: KanbanItem) => void;
  onOpenThread: (thread: Thread) => void;
  onRefresh: () => void;
}

export default function CardPopupModal({
  card,
  projects,
  onClose,
  onUpdate,
  onOpenThread,
  onRefresh,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);
  const [editDescription, setEditDescription] = useState(card.description || "");
  const [isLoading, setIsLoading] = useState(false);

  const project = projects.find((p) => p.id === card.project_id);

  const handleSaveEdit = useCallback(async () => {
    try {
      setIsLoading(true);
      await updateKanbanItem(
        card.id,
        editTitle,
        editDescription || undefined,
        undefined,
        undefined,
        undefined
      );
      onUpdate({
        ...card,
        title: editTitle,
        description: editDescription,
      });
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to save kanban item:", err);
    } finally {
      setIsLoading(false);
    }
  }, [card, editTitle, editDescription, onUpdate]);

  const handleArchive = useCallback(async () => {
    try {
      setIsLoading(true);
      await updateKanbanItem(
        card.id,
        undefined,
        undefined,
        undefined,
        undefined,
        "archived"
      );
      onRefresh();
      onClose();
    } catch (err) {
      console.error("Failed to archive kanban item:", err);
    } finally {
      setIsLoading(false);
    }
  }, [card.id, onRefresh, onClose]);

  const handleDelete = useCallback(async () => {
    if (!window.confirm("Delete this item?")) return;
    try {
      setIsLoading(true);
      await deleteKanbanItem(card.id);
      onRefresh();
      onClose();
    } catch (err) {
      console.error("Failed to delete kanban item:", err);
    } finally {
      setIsLoading(false);
    }
  }, [card.id, onRefresh, onClose]);

  const handleOpenAsThread = useCallback(async () => {
    try {
      setIsLoading(true);
      const threadName = card.title;
      const thread = await createThread(threadName, card.project_id);
      // Mark card as done
      await updateKanbanItem(
        card.id,
        undefined,
        undefined,
        "done",
        undefined,
        undefined
      );
      onClose();
      onOpenThread(thread);
    } catch (err) {
      console.error("Failed to open thread:", err);
    } finally {
      setIsLoading(false);
    }
  }, [card, onClose, onOpenThread]);

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          zIndex: 1000,
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "90%",
          maxWidth: 500,
          maxHeight: "80vh",
          background: "var(--color-surface)",
          borderRadius: 12,
          border: "1px solid var(--color-border)",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
          zIndex: 1001,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px",
            borderBottom: "1px solid var(--color-border)",
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>
            {isEditing ? "Edit Item" : "Item Details"}
          </div>
          <button
            onClick={onClose}
            style={{
              padding: "4px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "var(--color-text-2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {isEditing ? (
            <>
              {/* Edit mode */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--color-text-2)",
                    marginBottom: 6,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-surface-2)",
                    color: "var(--color-text)",
                    fontSize: 12,
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--color-text-2)",
                    marginBottom: 6,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-surface-2)",
                    color: "var(--color-text)",
                    fontSize: 12,
                    outline: "none",
                    fontFamily: "inherit",
                    minHeight: 80,
                    resize: "none",
                  }}
                />
              </div>
            </>
          ) : (
            <>
              {/* View mode */}
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--color-text-2)",
                    marginBottom: 6,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Title
                </div>
                <div style={{ fontSize: 13, color: "var(--color-text)", fontWeight: 500 }}>
                  {card.title}
                </div>
              </div>

              {card.description && (
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--color-text-2)",
                      marginBottom: 6,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Description
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--color-text)",
                      lineHeight: 1.5,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {card.description}
                  </div>
                </div>
              )}

              {project && (
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--color-text-2)",
                      marginBottom: 6,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Project
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 12,
                      color: "var(--color-text)",
                    }}
                  >
                    {project.color && (
                      <div
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          background: project.color,
                        }}
                      />
                    )}
                    {project.name}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "var(--color-text-2)",
                      marginBottom: 4,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Created
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-text-2)" }}>
                    {new Date(card.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "var(--color-text-2)",
                      marginBottom: 4,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Updated
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-text-2)" }}>
                    {new Date(card.updated_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            gap: 8,
            padding: "12px 16px",
            borderTop: "1px solid var(--color-border)",
            flexShrink: 0,
            flexWrap: "wrap",
          }}
        >
          {isEditing ? (
            <>
              <button
                onClick={handleSaveEdit}
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "none",
                  background: "var(--color-accent)",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: isLoading ? "default" : "pointer",
                  opacity: isLoading ? 0.5 : 1,
                  fontFamily: "inherit",
                }}
              >
                Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "1px solid var(--color-border)",
                  background: "transparent",
                  color: "var(--color-text-2)",
                  fontSize: 12,
                  cursor: isLoading ? "default" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleOpenAsThread}
                disabled={isLoading}
                title="Create thread"
                style={{
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "none",
                  background: "var(--color-accent)",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: isLoading ? "default" : "pointer",
                  opacity: isLoading ? 0.5 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontFamily: "inherit",
                }}
              >
                <IconMessageCircle size={14} />
                Chat
              </button>
              <button
                onClick={() => setIsEditing(true)}
                disabled={isLoading}
                title="Edit"
                style={{
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "1px solid var(--color-border)",
                  background: "transparent",
                  color: "var(--color-text-2)",
                  fontSize: 11,
                  cursor: isLoading ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontFamily: "inherit",
                }}
              >
                <IconEdit size={14} />
                Edit
              </button>
              <button
                onClick={handleArchive}
                disabled={isLoading}
                title="Archive"
                style={{
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "1px solid var(--color-border)",
                  background: "transparent",
                  color: "var(--color-text-2)",
                  fontSize: 11,
                  cursor: isLoading ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontFamily: "inherit",
                }}
              >
                <IconArchive size={14} />
              </button>
              <button
                onClick={handleDelete}
                disabled={isLoading}
                title="Delete"
                style={{
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "1px solid var(--color-border)",
                  background: "transparent",
                  color: "#ef4444",
                  fontSize: 11,
                  cursor: isLoading ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontFamily: "inherit",
                }}
              >
                <IconTrash size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
