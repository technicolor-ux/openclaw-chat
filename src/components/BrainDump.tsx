import { useCallback, useEffect, useRef, useState } from "react";
import {
  IconSparkles,
  IconTrash,
  IconArrowRight,
  IconCheck,
} from "@tabler/icons-react";
import {
  createBrainDump,
  deleteBrainDump,
  listBrainDumps,
  setBrainDumpProactive,
  updateBrainDumpStatus,
  type BrainDump as BrainDumpItem,
  type Project,
  type Thread,
} from "../lib/tauri";

interface Props {
  projects: Project[];
  /** Creates a thread in state+DB and returns it — pass addThread from useProjects */
  onCreateThread: (name: string, projectId?: string) => Promise<Thread>;
  onSelectThread: (thread: Thread) => void;
  /** Called whenever the open item count changes, so the header badge can update */
  onOpenCountChange?: (count: number) => void;
}

const STATUS_COLORS = {
  open: "#6b7280",
  in_progress: "#f59e0b",
  done: "#10b981",
};

export default function BrainDump({ projects, onCreateThread, onSelectThread, onOpenCountChange }: Props) {
  const [items, setItems] = useState<BrainDumpItem[]>([]);
  const [input, setInput] = useState("");
  const [projectId, setProjectId] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      const dumps = await listBrainDumps();
      setItems(dumps);
    } catch {}
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleAdd = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    try {
      const dump = await createBrainDump(trimmed, projectId || undefined);
      setItems((prev) => [dump, ...prev]);
      setInput("");
    } catch (err) {
      console.error("Failed to add brain dump:", err);
    }
  }, [input, projectId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteBrainDump(id);
      setItems((prev) => prev.filter((d) => d.id !== id));
    } catch {}
  }, []);

  const handleToggleProactive = useCallback(async (item: BrainDumpItem) => {
    try {
      await setBrainDumpProactive(item.id, !item.proactive);
      setItems((prev) =>
        prev.map((d) => (d.id === item.id ? { ...d, proactive: !d.proactive } : d))
      );
    } catch {}
  }, []);

  const handleDone = useCallback(async (id: string) => {
    try {
      await updateBrainDumpStatus(id, "done");
      setItems((prev) =>
        prev.map((d) => (d.id === id ? { ...d, status: "done" as const } : d))
      );
    } catch {}
  }, []);

  const handleOpenThread = useCallback(
    async (item: BrainDumpItem) => {
      try {
        const threadName = item.content.slice(0, 60) + (item.content.length > 60 ? "…" : "");
        const thread = await onCreateThread(threadName, item.project_id);
        await updateBrainDumpStatus(item.id, "in_progress");
        setItems((prev) =>
          prev.map((d) =>
            d.id === item.id ? { ...d, status: "in_progress" as const } : d
          )
        );
        onSelectThread(thread);
      } catch (err) {
        console.error("Failed to open thread from brain dump:", err);
      }
    },
    [onCreateThread, onSelectThread]
  );

  const openCount = items.filter((d) => d.status === "open").length;

  useEffect(() => {
    onOpenCountChange?.(openCount);
  }, [openCount, onOpenCountChange]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Quick capture */}
      <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid var(--color-border)", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Capture a thought…"
            style={{
              flex: 1,
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface-2)",
              color: "var(--color-text)",
              fontSize: 13,
              outline: "none",
              fontFamily: "inherit",
            }}
          />
          <button
            onClick={handleAdd}
            disabled={!input.trim()}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "none",
              background: input.trim() ? "var(--color-accent)" : "var(--color-surface-3)",
              color: input.trim() ? "#fff" : "var(--color-text-2)",
              fontSize: 13,
              cursor: input.trim() ? "pointer" : "default",
              fontWeight: 500,
            }}
          >
            Add
          </button>
        </div>

        {projects.length > 0 && (
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            style={{
              width: "100%",
              padding: "4px 8px",
              borderRadius: 6,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface-2)",
              color: "var(--color-text-2)",
              fontSize: 12,
              outline: "none",
            }}
          >
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Items list — fills remaining height */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {items.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--color-text-2)", textAlign: "center", padding: "16px 0" }}>
            No brain dumps yet.
          </div>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              background: "var(--color-surface-2)",
              borderRadius: 8,
              padding: "8px 10px",
              fontSize: 12,
              border: "1px solid var(--color-border)",
              opacity: item.status === "done" ? 0.5 : 1,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
              {/* Status dot */}
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: STATUS_COLORS[item.status],
                  marginTop: 4,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, color: "var(--color-text)", lineHeight: 1.4 }}>
                {item.content}
              </div>
            </div>

            {item.project_id && (
              <div style={{ marginTop: 4, marginLeft: 13 }}>
                <span
                  style={{
                    fontSize: 10,
                    background: "var(--color-surface-3)",
                    color: "var(--color-text-2)",
                    borderRadius: 4,
                    padding: "1px 5px",
                  }}
                >
                  {projects.find((p) => p.id === item.project_id)?.name ?? "Project"}
                </span>
              </div>
            )}

            <div style={{ display: "flex", gap: 4, marginTop: 6, marginLeft: 13 }}>
              {item.status !== "done" && (
                <>
                  <ActionButton title="Open as thread" onClick={() => handleOpenThread(item)}>
                    <IconArrowRight size={11} />
                    Thread
                  </ActionButton>
                  <ActionButton
                    title="Let OpenClaw follow up autonomously"
                    onClick={() => handleToggleProactive(item)}
                    active={item.proactive}
                  >
                    <IconSparkles size={11} />
                    {item.proactive ? "Auto on" : "Auto"}
                  </ActionButton>
                  <ActionButton title="Mark done" onClick={() => handleDone(item.id)}>
                    <IconCheck size={11} />
                  </ActionButton>
                </>
              )}
              <ActionButton title="Delete" onClick={() => handleDelete(item.id)} danger>
                <IconTrash size={11} />
              </ActionButton>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  title,
  active,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        padding: "2px 7px",
        borderRadius: 5,
        border: "1px solid var(--color-border)",
        background: active
          ? "var(--color-accent)"
          : danger
          ? "transparent"
          : "var(--color-surface-3)",
        color: active ? "#fff" : danger ? "#ef4444" : "var(--color-text-2)",
        fontSize: 11,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 3,
        fontFamily: "inherit",
      }}
    >
      {children}
    </button>
  );
}
