import { useDraggable } from "@dnd-kit/core";
import { type KanbanItem, type Project } from "../lib/tauri";

interface Props {
  item: KanbanItem;
  projects: Project[];
  onSelect: (card: KanbanItem) => void;
}

export default function KanbanCard({ item, projects, onSelect }: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
  });

  const project = projects.find((p) => p.id === item.project_id);
  const sourceLabel = item.source_type === "brain_dump" ? "From dump" : undefined;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onSelect(item)}
      style={{
        padding: 10,
        borderRadius: 6,
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        cursor: isDragging ? "grabbing" : "pointer",
        opacity: isDragging ? 0.5 : 1,
        transition: "opacity 0.2s",
        fontSize: 12,
        color: "var(--color-text)",
        lineHeight: 1.4,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--color-surface-3)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--color-surface)";
      }}
    >
      {/* Project color dot + title */}
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        {project?.color && (
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: project.color,
              marginTop: 2,
              flexShrink: 0,
            }}
          />
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 500, color: "var(--color-text)" }}>
            {item.title}
          </div>
          {item.description && (
            <div
              style={{
                fontSize: 11,
                color: "var(--color-text-2)",
                marginTop: 4,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {item.description}
            </div>
          )}
        </div>
      </div>

      {/* Project badge + source badge */}
      {(project || sourceLabel) && (
        <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
          {project && (
            <span
              style={{
                fontSize: 10,
                background: "var(--color-surface-2)",
                color: "var(--color-text-2)",
                borderRadius: 3,
                padding: "2px 5px",
              }}
            >
              {project.name}
            </span>
          )}
          {sourceLabel && (
            <span
              style={{
                fontSize: 10,
                background: "var(--color-surface-2)",
                color: "var(--color-text-2)",
                borderRadius: 3,
                padding: "2px 5px",
              }}
            >
              {sourceLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
