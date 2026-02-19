import { useDraggable } from "@dnd-kit/core";
import { IconDots } from "@tabler/icons-react";
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

  // Clamp description to 3 lines
  const descriptionLines = item.description ? item.description.split("\n").slice(0, 3).join("\n") : "";
  const isDescriptionTruncated =
    item.description && (item.description.split("\n").length > 3 || descriptionLines.length < item.description.length);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(item);
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onSelect(item)}
      style={{
        padding: 12,
        paddingRight: 36, // Extra space for menu button
        borderRadius: 8,
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        cursor: isDragging ? "grabbing" : "pointer",
        opacity: isDragging ? 0.5 : 1,
        transition: "all 0.2s",
        color: "var(--color-text)",
        position: "relative",
        minHeight: 80,
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--color-surface-3)";
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--color-surface)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Menu button - top right */}
      <button
        onClick={handleMenuClick}
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
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--color-surface-2)";
          e.currentTarget.style.color = "var(--color-text)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--color-text-2)";
        }}
        title="Open card details"
      >
        <IconDots size={16} />
      </button>

      {/* Project color dot */}
      {project?.color && (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: project.color,
            flexShrink: 0,
          }}
        />
      )}

      {/* Title - with wrapping, max 3 lines */}
      <div
        style={{
          fontWeight: 600,
          fontSize: 13,
          color: "var(--color-text)",
          marginBottom: 8,
          marginLeft: project?.color ? 16 : 0,
          lineHeight: 1.3,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
        } as any}
      >
        {item.title}
      </div>

      {/* Description preview - max 3 lines with ellipsis */}
      {descriptionLines && (
        <div
          style={{
            fontSize: 12,
            color: "var(--color-text-2)",
            marginBottom: 8,
            lineHeight: 1.4,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
          } as any}
        >
          {descriptionLines}
          {isDescriptionTruncated && " …"}
        </div>
      )}

      {/* Badges at bottom */}
      <div style={{ display: "flex", gap: 4, marginTop: "auto", flexWrap: "wrap" }}>
        {project && (
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
            {project.name}
          </span>
        )}
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
