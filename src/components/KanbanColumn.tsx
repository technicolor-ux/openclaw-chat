import { useDroppable } from "@dnd-kit/core";
import { useState } from "react";
import { IconPlus } from "@tabler/icons-react";
import { createKanbanItem, type KanbanItem, type Project } from "../lib/tauri";
import KanbanCard from "./KanbanCard";

interface Props {
  columnId: string;
  label: string;
  items: KanbanItem[];
  projects: Project[];
  onSelectCard: (card: KanbanItem) => void;
  onRefresh: () => void;
}

export default function KanbanColumn({
  columnId,
  label,
  items,
  projects,
  onSelectCard,
  onRefresh,
}: Props) {
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const { setNodeRef } = useDroppable({ id: `column-${columnId}` });

  const handleAddClick = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    try {
      await createKanbanItem(trimmed, undefined, undefined, columnId);
      setInputValue("");
      setIsAddingItem(false);
      onRefresh();
    } catch (err) {
      console.error("Failed to create kanban item:", err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddClick();
    } else if (e.key === "Escape") {
      setIsAddingItem(false);
      setInputValue("");
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        display: "flex",
        flexDirection: "column",
        width: 280,
        flexShrink: 0,
        background: "var(--color-surface-2)",
        borderRadius: 8,
        border: "1px solid var(--color-border)",
        overflow: "hidden",
      }}
    >
      {/* Column header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--color-border)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--color-text-2)",
              letterSpacing: "0.5px",
              textTransform: "uppercase",
            }}
          >
            {label}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => setIsAddingItem(true)}
              title="Add item"
              style={{
                padding: "4px 6px",
                borderRadius: 5,
                border: "1px solid var(--color-border)",
                background: "transparent",
                color: "var(--color-text-2)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--color-surface-3)";
                e.currentTarget.style.color = "var(--color-text)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--color-text-2)";
              }}
            >
              <IconPlus size={14} />
            </button>
            <div
              style={{
                fontSize: 11,
                color: "var(--color-text-3)",
                background: "var(--color-surface-3)",
                borderRadius: 10,
                padding: "2px 6px",
                minWidth: 18,
                textAlign: "center",
              }}
            >
              {items.length}
            </div>
          </div>
        </div>
      </div>

      {/* Items list - fills remaining space */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          minHeight: 0,
        }}
      >
        {isAddingItem ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <input
              type="text"
              autoFocus
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add item…"
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                color: "var(--color-text)",
                fontSize: 12,
                outline: "none",
                fontFamily: "inherit",
              }}
            />
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={handleAddClick}
                disabled={!inputValue.trim()}
                style={{
                  flex: 1,
                  padding: "4px 8px",
                  borderRadius: 5,
                  border: "none",
                  background: inputValue.trim()
                    ? "var(--color-accent)"
                    : "var(--color-surface-3)",
                  color: inputValue.trim() ? "#fff" : "var(--color-text-2)",
                  fontSize: 11,
                  cursor: inputValue.trim() ? "pointer" : "default",
                  fontWeight: 500,
                }}
              >
                Add
              </button>
              <button
                onClick={() => {
                  setIsAddingItem(false);
                  setInputValue("");
                }}
                style={{
                  flex: 1,
                  padding: "4px 8px",
                  borderRadius: 5,
                  border: "1px solid var(--color-border)",
                  background: "transparent",
                  color: "var(--color-text-2)",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          items.map((item) => (
            <KanbanCard
              key={item.id}
              item={item}
              projects={projects}
              onSelect={onSelectCard}
            />
          ))
        )}
      </div>
    </div>
  );
}
