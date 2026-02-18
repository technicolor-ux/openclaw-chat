import { useCallback, useEffect, useRef, useState } from "react";
import { IconX } from "@tabler/icons-react";
import type { Project } from "../lib/tauri";

interface Props {
  projects: Project[];
  defaultProjectId?: string;
  onClose: () => void;
  onCreate: (name: string, projectId?: string) => void;
}

export default function NewThreadModal({ projects, defaultProjectId, onClose, onCreate }: Props) {
  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState<string>(defaultProjectId ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = name.trim();
      if (!trimmed) return;
      onCreate(trimmed, projectId || undefined);
      onClose();
    },
    [name, projectId, onCreate, onClose]
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 12,
          padding: 24,
          width: 400,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>New Thread</h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-text-2)",
              padding: 4,
              borderRadius: 6,
            }}
          >
            <IconX size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Thread name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface-2)",
              color: "var(--color-text)",
              fontSize: 14,
              outline: "none",
            }}
          />

          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface-2)",
              color: "var(--color-text)",
              fontSize: 14,
              outline: "none",
            }}
          >
            <option value="">No project (standalone)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface-2)",
                color: "var(--color-text)",
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                background: name.trim() ? "var(--color-accent)" : "var(--color-surface-3)",
                color: name.trim() ? "#fff" : "var(--color-text-2)",
                fontSize: 14,
                cursor: name.trim() ? "pointer" : "default",
                fontWeight: 500,
              }}
            >
              Create Thread
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
