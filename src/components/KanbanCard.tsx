import { useDraggable } from "@dnd-kit/core";
import { useState, useRef } from "react";
import { IconDots } from "@tabler/icons-react";
import { updateKanbanItem, type KanbanItem, type Project } from "../lib/tauri";

interface Props {
  item: KanbanItem;
  projects: Project[];
  onSelect: (card: KanbanItem) => void;
  onUpdate?: (card: KanbanItem) => void;
}

export default function KanbanCard({ item, projects, onSelect, onUpdate }: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
  });

  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top?: number; bottom?: number; left: number }>({ left: 0 });
  const projectSelectorRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);

  const project = projects.find((p) => p.id === item.project_id);
  const sourceLabel = item.source_type === "brain_dump" ? "From dump" : undefined;

  const handleCardMouseUp = (e: React.MouseEvent) => {
    // Don't open card if clicking within the project selector area
    if (projectSelectorRef.current?.contains(e.target as Node)) {
      return;
    }
    if (!isDragging && e.buttons === 0) {
      onSelect(item);
    }
  };

  const handleProjectChange = async (newProjectId: string | undefined) => {
    try {
      await updateKanbanItem(item.id, undefined, undefined, undefined, undefined, undefined, newProjectId ?? "");
      const updatedItem = { ...item, project_id: newProjectId };
      onUpdate?.(updatedItem);
      setShowProjectSelector(false);
    } catch (err) {
      console.error("Failed to change project:", err);
    }
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onMouseUp={handleCardMouseUp}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: 12,
        paddingRight: 36,
        borderRadius: 8,
        background: hovered ? "var(--color-surface-3)" : "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderLeft: project?.color ? `3px solid ${project.color}` : "1px solid var(--color-border)",
        boxShadow: hovered ? "0 2px 8px rgba(0, 0, 0, 0.1)" : "none",
        cursor: isDragging ? "grabbing" : "pointer",
        opacity: isDragging ? 0.5 : 1,
        transition: "all 0.2s",
        color: "var(--color-text)",
        position: "relative",
        minHeight: 80,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Menu button (⋯) - top right */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => {
          e.stopPropagation();
          onSelect(item);
        }}
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          padding: "4px 6px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "var(--color-text-2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 4,
        }}
        title="Open card details"
      >
        <IconDots size={16} />
      </div>

      {/* Title - max 2 lines, truncated with ellipsis */}
      <div
        style={{
          fontWeight: 600,
          fontSize: 13,
          color: "var(--color-text)",
          marginBottom: 8,
          lineHeight: "17px",
          maxHeight: 34,
          overflow: "hidden",
          wordBreak: "break-word",
        }}
      >
        {item.title && item.title.length > 60
          ? item.title.slice(0, 60).trimEnd() + "…"
          : item.title}
      </div>

      {/* Description preview - max 2 lines, truncated with ellipsis */}
      {item.description && (
        <div
          style={{
            fontSize: 12,
            color: "var(--color-text-2)",
            marginBottom: 8,
            lineHeight: "17px",
            maxHeight: 34,
            overflow: "hidden",
            wordBreak: "break-word",
          }}
        >
          {item.description.length > 80
            ? item.description.slice(0, 80).trimEnd() + "…"
            : item.description}
        </div>
      )}

      {/* Badges */}
      <div style={{ display: "flex", gap: 4, marginTop: "auto", flexWrap: "wrap" }}>
        {/* Project badge — clickable to reassign */}
        <div
          ref={projectSelectorRef}
          onPointerDown={(e) => e.stopPropagation()}
          style={{ position: "relative" }}
        >
          <div
            ref={badgeRef}
            onClick={() => {
              if (!showProjectSelector && badgeRef.current) {
                const rect = badgeRef.current.getBoundingClientRect();
                const spaceBelow = window.innerHeight - rect.bottom;
                const spaceAbove = rect.top;
                if (spaceBelow >= spaceAbove) {
                  setDropdownPos({ top: rect.bottom + 4, left: rect.left });
                } else {
                  setDropdownPos({ bottom: window.innerHeight - rect.top + 4, left: rect.left });
                }
              }
              setShowProjectSelector((v) => !v);
            }}
            style={{
              fontSize: 10,
              background: "var(--color-surface-2)",
              color: "var(--color-text-2)",
              borderRadius: 4,
              padding: "3px 6px",
              whiteSpace: "nowrap",
              cursor: "pointer",
              userSelect: "none",
            }}
            title="Click to change project"
          >
            {project ? project.name : "No project"}
          </div>

          {/* Dropdown */}
          {showProjectSelector && (
            <>
              {/* Backdrop */}
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 99,
                }}
                onClick={() => setShowProjectSelector(false)}
              />
              {/* Menu */}
              <div
                style={{
                  position: "fixed",
                  ...(dropdownPos.top != null ? { top: dropdownPos.top } : {}),
                  ...(dropdownPos.bottom != null ? { bottom: dropdownPos.bottom } : {}),
                  left: dropdownPos.left,
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 6,
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                  zIndex: 100,
                  minWidth: 140,
                  maxHeight: 200,
                  overflowY: "auto",
                }}
              >
                <div
                  onClick={() => handleProjectChange(undefined)}
                  onMouseEnter={() => setHoveredProjectId("__none__")}
                  onMouseLeave={() => setHoveredProjectId(null)}
                  style={{
                    padding: "6px 10px",
                    fontSize: 11,
                    color: hoveredProjectId === "__none__" ? "#fff" : "var(--color-text-2)",
                    background: hoveredProjectId === "__none__" ? "var(--color-accent)" : "transparent",
                    cursor: "pointer",
                    borderBottom: "1px solid var(--color-border)",
                  }}
                >
                  No project
                </div>
                {projects.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleProjectChange(p.id)}
                    onMouseEnter={() => setHoveredProjectId(p.id)}
                    onMouseLeave={() => setHoveredProjectId(null)}
                    style={{
                      padding: "6px 10px",
                      fontSize: 11,
                      color: hoveredProjectId === p.id ? "#fff" : "var(--color-text)",
                      background: hoveredProjectId === p.id ? "var(--color-accent)" : "transparent",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {p.color && (
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: p.color,
                          flexShrink: 0,
                        }}
                      />
                    )}
                    {p.name}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {sourceLabel && (
          <span
            style={{
              fontSize: 10,
              background: "var(--color-surface-2)",
              color: "var(--color-text-2)",
              borderRadius: 4,
              padding: "3px 6px",
              whiteSpace: "nowrap",
            }}
          >
            {sourceLabel}
          </span>
        )}
      </div>
    </div>
  );
}
