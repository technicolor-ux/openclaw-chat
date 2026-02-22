import { useState } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import {
  IconPlus,
  IconMessage,
  IconTrash,
} from "@tabler/icons-react";
import type { Project, Thread } from "../lib/tauri";

interface Props {
  width: number;
  projects: Project[];
  standaloneThreads: Thread[];
  activeThread: Thread | null;
  activeProject: Project | null;
  onSelectThread: (thread: Thread) => void;
  onSelectProject: (project: Project) => void;
  onNewThread: (projectId?: string) => void;
  onNewProject: () => void;
  onDeleteThread: (thread: Thread) => void;
  onDeleteProject: (project: Project) => void;
  activeView: "chat" | "board";
  onViewChange: (view: "chat" | "board") => void;
  selectedProjectFilters?: string[];
  onProjectFilterChange?: (projectIds: string[]) => void;
}

export default function Sidebar({
  width,
  projects,
  standaloneThreads,
  activeThread,
  activeProject,
  onSelectThread,
  onSelectProject,
  onNewThread,
  onNewProject,
  onDeleteThread,
  onDeleteProject,
  activeView,
  onViewChange,
  selectedProjectFilters = [],
  onProjectFilterChange = () => {},
}: Props) {
  const [hoveredThread, setHoveredThread] = useState<string | null>(null);
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);

  return (
    <div
      style={{
        width,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        background: "var(--color-surface-2)",
        overflowY: "auto",
        userSelect: "none",
      }}
    >
      {/* Traffic light spacer (macOS overlay titlebar) */}
      <div
        data-tauri-drag-region
        className="traffic-light-spacer"
        onMouseDown={(e) => {
          if (e.buttons === 1) getCurrentWebviewWindow().startDragging();
        }}
      />

      {/* Chat/Board toggle pill */}
      <div style={{ padding: "8px 10px" }}>
        <div
          style={{
            display: "flex",
            background: "var(--color-surface-3)",
            borderRadius: 20,
            border: "1px solid var(--color-border)",
            padding: "4px",
            gap: 4,
          }}
        >
          <button
            onClick={() => onViewChange("chat")}
            style={{
              flex: 1,
              padding: "6px 12px",
              borderRadius: 16,
              border: "none",
              background: activeView === "chat" ? "var(--color-accent)" : "transparent",
              color: activeView === "chat" ? "#fff" : "var(--color-text-2)",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.2s",
              fontFamily: "inherit",
            }}
          >
            Chat
          </button>
          <button
            onClick={() => onViewChange("board")}
            style={{
              flex: 1,
              padding: "6px 12px",
              borderRadius: 16,
              border: "none",
              background: activeView === "board" ? "var(--color-accent)" : "transparent",
              color: activeView === "board" ? "#fff" : "var(--color-text-2)",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.2s",
              fontFamily: "inherit",
            }}
          >
            Board
          </button>
        </div>
      </div>

      {/* New Thread button (chat mode only) */}
      {activeView === "chat" && (
        <div style={{ padding: "0 10px 8px" }}>
          <button
            onClick={() => onNewThread()}
            style={{
              width: "100%",
              padding: "7px 12px",
              borderRadius: 8,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface-3)",
              color: "var(--color-text)",
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontWeight: 500,
            }}
          >
            <IconPlus size={15} />
            New Thread
          </button>
        </div>
      )}

      {/* Board Filters section (board view only) */}
      {activeView === "board" && (
        <>
          <SectionHeader label="Filters" />
          <div style={{ padding: "0 10px 12px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {/* "All" pill */}
              <button
                onClick={() => onProjectFilterChange([])}
                style={{
                  padding: "6px 12px",
                  borderRadius: 16,
                  border: "1px solid var(--color-border)",
                  background:
                    selectedProjectFilters.length === 0
                      ? "var(--color-accent)"
                      : "transparent",
                  color:
                    selectedProjectFilters.length === 0
                      ? "#fff"
                      : "var(--color-text-2)",
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  fontFamily: "inherit",
                }}
              >
                All
              </button>
              {/* Project filter pills */}
              {projects.map((project) => {
                const isSelected = selectedProjectFilters.includes(project.id);
                return (
                  <button
                    key={project.id}
                    onClick={() => {
                      const newFilters = isSelected
                        ? selectedProjectFilters.filter((id) => id !== project.id)
                        : [...selectedProjectFilters, project.id];
                      onProjectFilterChange(newFilters);
                    }}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 16,
                      border: `1px solid ${project.color || "var(--color-border)"}`,
                      background: isSelected
                        ? project.color || "var(--color-accent)"
                        : "transparent",
                      color: isSelected ? "#fff" : "var(--color-text-2)",
                      fontSize: 11,
                      fontWeight: 500,
                      cursor: "pointer",
                      transition: "all 0.15s",
                      fontFamily: "inherit",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {project.name}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Projects section (chat view only) */}
      {activeView === "chat" && (
        <>
          <SectionHeader
            label="Projects"
            onAdd={onNewProject}
            addTitle="New project"
          />
        </>
      )}

      {activeView === "chat" && (
        <div style={{ flex: 1 }}>
          {projects.map((project) => (
          <div key={project.id}>
            {/* Project row */}
            <div
              style={{ position: "relative" }}
              onMouseEnter={() => setHoveredProject(project.id)}
              onMouseLeave={() => setHoveredProject(null)}
            >
              <button
                onClick={() => onSelectProject(project)}
                style={{
                  width: "calc(100% - 8px)",
                  padding: "5px 12px 5px 10px",
                  background: activeProject?.id === project.id
                    ? "var(--color-accent)"
                    : hoveredProject === project.id
                    ? "var(--color-surface-3)"
                    : "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: activeProject?.id === project.id ? "#fff" : "var(--color-text)",
                  fontSize: 13,
                  fontWeight: 600,
                  textAlign: "left",
                  borderRadius: 6,
                  margin: "1px 4px",
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: project.color ?? "#7c3aed",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {project.name}
                </span>
              </button>

              {/* Project actions */}
              {hoveredProject === project.id && (
                <div
                  style={{
                    position: "absolute",
                    right: 6,
                    top: "50%",
                    transform: "translateY(-50%)",
                    display: "flex",
                    gap: 2,
                  }}
                >
                  <IconButton
                    onClick={() => onNewThread(project.id)}
                    title="New thread in project"
                  >
                    <IconPlus size={13} />
                  </IconButton>
                  <IconButton
                    onClick={() => onDeleteProject(project)}
                    title="Delete project"
                    danger
                  >
                    <IconTrash size={13} />
                  </IconButton>
                </div>
              )}
            </div>
          </div>
        ))}

        {projects.length === 0 && (
          <div
            style={{
              fontSize: 12,
              color: "var(--color-text-2)",
              padding: "4px 14px 8px",
            }}
          >
            No projects yet.
          </div>
        )}

        {/* Standalone threads section */}
        <SectionHeader label="Threads" />
        {standaloneThreads.map((thread) => (
          <ThreadRow
            key={thread.id}
            thread={thread}
            active={activeThread?.id === thread.id}
            hovered={hoveredThread === thread.id}
            onSelect={() => onSelectThread(thread)}
            onDelete={() => onDeleteThread(thread)}
            onMouseEnter={() => setHoveredThread(thread.id)}
            onMouseLeave={() => setHoveredThread(null)}
          />
        ))}
        {standaloneThreads.length === 0 && (
          <div
            style={{
              fontSize: 12,
              color: "var(--color-text-2)",
              padding: "4px 14px 8px",
            }}
          >
            No standalone threads.
          </div>
        )}
        </div>
      )}
    </div>
  );
}

function SectionHeader({
  label,
  onAdd,
  addTitle,
}: {
  label: string;
  onAdd?: () => void;
  addTitle?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "8px 12px 4px",
      }}
    >
      <span
        style={{
          flex: 1,
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 1,
          color: "var(--color-text-2)",
        }}
      >
        {label}
      </span>
      {onAdd && (
        <button
          onClick={onAdd}
          title={addTitle}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--color-text-2)",
            padding: 2,
            borderRadius: 4,
            display: "flex",
          }}
        >
          <IconPlus size={14} />
        </button>
      )}
    </div>
  );
}

function ThreadRow({
  thread,
  active,
  hovered,
  onSelect,
  onDelete,
  onMouseEnter,
  onMouseLeave,
}: {
  thread: Thread;
  active: boolean;
  hovered: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <button
        onClick={onSelect}
        style={{
          width: "calc(100% - 8px)",
          padding: "5px 10px",
          background: active
            ? "var(--color-accent)"
            : hovered
            ? "var(--color-surface-3)"
            : "none",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: active ? "#fff" : "var(--color-text)",
          fontSize: 13,
          borderRadius: 6,
          margin: "1px 4px",
          textAlign: "left",
        }}
      >
        <IconMessage size={13} opacity={0.6} />
        <span
          style={{
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {thread.name}
        </span>
      </button>

      {hovered && !active && (
        <div
          style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
          }}
        >
          <IconButton onClick={onDelete} title="Delete thread" danger>
            <IconTrash size={12} />
          </IconButton>
        </div>
      )}
    </div>
  );
}

function IconButton({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={title}
      style={{
        background: "var(--color-surface-3)",
        border: "none",
        cursor: "pointer",
        padding: "3px 4px",
        borderRadius: 5,
        color: danger ? "#ef4444" : "var(--color-text-2)",
        display: "flex",
        alignItems: "center",
      }}
    >
      {children}
    </button>
  );
}
