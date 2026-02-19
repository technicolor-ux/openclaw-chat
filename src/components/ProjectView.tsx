import { useState } from "react";
import { IconMessage, IconPlus, IconFolder, IconLayoutKanban } from "@tabler/icons-react";
import type { Project, Thread } from "../lib/tauri";

interface Props {
  project: Project;
  threads: Thread[];
  onSelectThread: (thread: Thread) => void;
  onNewThread: (projectId: string) => void;
  onGoToBoard: () => void;
}

export default function ProjectView({ project, threads, onSelectThread, onNewThread, onGoToBoard }: Props) {
  const [hoveredThread, setHoveredThread] = useState<string | null>(null);
  const [boardBtnHovered, setBoardBtnHovered] = useState(false);

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "32px 40px",
        maxWidth: 640,
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* Project header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: project.color ?? "#7c3aed",
              flexShrink: 0,
            }}
          />
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "var(--color-text)",
              margin: 0,
            }}
          >
            {project.name}
          </h1>
        </div>
        <button
          onClick={onGoToBoard}
          onMouseEnter={() => setBoardBtnHovered(true)}
          onMouseLeave={() => setBoardBtnHovered(false)}
          title="View project in board"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "5px 10px",
            borderRadius: 7,
            border: "1px solid var(--color-border)",
            background: boardBtnHovered ? "var(--color-surface-3)" : "var(--color-surface-2)",
            color: "var(--color-text-2)",
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
            flexShrink: 0,
            transition: "background 0.15s",
          }}
        >
          <IconLayoutKanban size={13} />
          Board
        </button>
      </div>

      {/* Description */}
      {project.description && (
        <p
          style={{
            fontSize: 14,
            color: "var(--color-text-2)",
            lineHeight: 1.6,
            margin: "0 0 0 26px",
            whiteSpace: "pre-wrap",
          }}
        >
          {project.description}
        </p>
      )}

      {/* Divider */}
      <div
        style={{
          height: 1,
          background: "var(--color-border)",
          margin: "24px 0 20px",
        }}
      />

      {/* Thread list header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--color-text-2)",
            textTransform: "uppercase",
            letterSpacing: 0.8,
          }}
        >
          Threads
        </span>
        {threads.length > 0 && <button
          onClick={() => onNewThread(project.id)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "5px 12px",
            borderRadius: 7,
            border: "1px solid var(--color-border)",
            background: "var(--color-surface-3)",
            color: "var(--color-text)",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          <IconPlus size={14} />
          New Thread
        </button>}
      </div>

      {/* Thread list */}
      {threads.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {threads.map((thread) => (
            <button
              key={thread.id}
              onClick={() => onSelectThread(thread)}
              onMouseEnter={() => setHoveredThread(thread.id)}
              onMouseLeave={() => setHoveredThread(null)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 8,
                border: "none",
                background: hoveredThread === thread.id ? "var(--color-surface-3)" : "none",
                cursor: "pointer",
                color: "var(--color-text)",
                fontSize: 14,
                textAlign: "left",
                width: "100%",
                transition: "background 0.1s",
              }}
            >
              <IconMessage size={15} style={{ opacity: 0.5, flexShrink: 0 }} />
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
              <span
                style={{
                  fontSize: 12,
                  color: "var(--color-text-2)",
                  flexShrink: 0,
                }}
              >
                {formatDate(thread.updated_at)}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div
          style={{
            textAlign: "center",
            padding: "40px 20px",
            color: "var(--color-text-2)",
          }}
        >
          <IconFolder size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
          <div style={{ fontSize: 14, marginBottom: 16 }}>No threads in this project yet.</div>
          <button
            onClick={() => onNewThread(project.id)}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              border: "none",
              background: "var(--color-accent)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Create First Thread
          </button>
        </div>
      )}
    </div>
  );
}

function formatDate(epoch: number): string {
  const d = new Date(epoch * 1000);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString(undefined, { weekday: "short" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
