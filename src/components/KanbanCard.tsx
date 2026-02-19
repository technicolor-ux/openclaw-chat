import { useDraggable } from "@dnd-kit/core";
import { useState } from "react";
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
  const [projectHovered, setProjectHovered] = useState<string | undefined>(undefined);

  const project = projects.find((p) => p.id === item.project_id);
  const sourceLabel = item.source_type === "brain_dump" ? "From dump" : undefined;

  // Clamp description to 3 lines
  const descriptionLines = item.description ? item.description.split("\n").slice(0, 3).join("\n") : "";
  const isDescriptionTruncated =
    item.description && (item.description.split("\n").length > 3 || descriptionLines.length < item.description.length);

  const handleCardClick = (e: React.MouseEvent) => {
    // Only trigger on actual click, not drag
    if (!isDragging && e.buttons === 0) {
      console.log("Card clicked:", item.id); // Debug
      onSelect(item);
    }
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log("Menu clicked:", item.id); // Debug
    onSelect(item);
  };

  const handleProjectChange = async (newProjectId: string | undefined) => {
    try {
      await updateKanbanItem(item.id, undefined, undefined, undefined, undefined, undefined);
      // Update the item with new project_id
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
      onMouseUp={handleCardClick}
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
      <div style={{ display: "flex", gap: 4, marginTop: "auto", flexWrap: "wrap", position: "relative" }}>
        {/* Project badge - clickable to change project */}
        {(project || !item.project_id) && (
          <div style={{ position: "relative" }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowProjectSelector(!showProjectSelector);
              }}
              style={{
                fontSize: 10,
                background: "var(--color-surface-2)",
                color: "var(--color-text-2)",
                border: "none",
                borderRadius: 4,
                padding: "3px 6px",
                whiteSpace: "nowrap",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--color-surface-3)";
                e.currentTarget.style.color = "var(--color-text)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--color-surface-2)";
                e.currentTarget.style.color = "var(--color-text-2)";
              }}
              title="Click to change project"
            >
              {project ? project.name : "No project"}
            </button>

            {/* Project selector dropdown */}
            {showProjectSelector && (
              <div
                style={{
                  position: "absolute",
                  bottom: "100%",
                  left: 0,
                  marginBottom: 4,
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
                {/* No project option */}
                <div
                  onClick={() => handleProjectChange(undefined)}
                  onMouseEnter={() => setProjectHovered(undefined)}
                  style={{
                    padding: "6px 10px",
                    fontSize: 10,
                    color: projectHovered === undefined ? "#fff" : "var(--color-text)",
                    background: projectHovered === undefined ? "var(--color-accent)" : "transparent",
                    cursor: "pointer",
                    transition: "all 0.1s",
                    borderBottom: "1px solid var(--color-border)",
                  }}
                >
                  No project
                </div>
                {/* Project options */}
                {projects.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleProjectChange(p.id)}
                    onMouseEnter={() => setProjectHovered(p.id)}
                    onMouseLeave={() => setProjectHovered(undefined)}
                    style={{
                      padding: "6px 10px",
                      fontSize: 10,
                      color: projectHovered === p.id ? "#fff" : "var(--color-text)",
                      background: projectHovered === p.id ? "var(--color-accent)" : "transparent",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      transition: "all 0.1s",
                    }}
                  >
                    {p.color && (
                      <div
                        style={{
                          width: 6,
                          height: 6,
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
            )}

            {/* Backdrop to close dropdown */}
            {showProjectSelector && (
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
            )}
          </div>
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
