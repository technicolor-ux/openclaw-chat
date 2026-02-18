import { useState, useCallback, useEffect, useRef } from "react";
import { IconSun, IconMoon, IconSettings, IconAdjustmentsHorizontal, IconBrain } from "@tabler/icons-react";
import Sidebar from "./components/Sidebar";
import BrainDump from "./components/BrainDump";
import ChatView from "./components/ChatView";
import NewThreadModal from "./components/NewThreadModal";
import NewProjectModal from "./components/NewProjectModal";
import SettingsPanel from "./components/SettingsPanel";
import { useTheme } from "./hooks/useTheme";
import { useProjects } from "./hooks/useProjects";
import { onBrainDumpFollowedUp } from "./lib/tauri";
import type { Thread, Project } from "./lib/tauri";

export default function App() {
  const { mode, setMode, cycle } = useTheme();
  const isDark = document.documentElement.classList.contains("dark");

  const {
    projects,
    standaloneThreads,
    projectThreads,
    addProject,
    removeProject,
    addThread,
    removeThread,
    touchThread,
  } = useProjects();

  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [showNewThread, setShowNewThread] = useState(false);
  const [newThreadProjectId, setNewThreadProjectId] = useState<string | undefined>();
  const [showNewProject, setShowNewProject] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showBrainDump, setShowBrainDump] = useState(false);
  const [brainDumpOpenCount, setBrainDumpOpenCount] = useState(0);

  // Resizable sidebar
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [isResizing, setIsResizing] = useState(false);
  const startWidthRef = useRef(240);
  const startXRef = useRef(0);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startXRef.current = e.clientX;
    startWidthRef.current = sidebarWidth;
    setIsResizing(true);
    const onMove = (ev: MouseEvent) => {
      const newW = Math.max(160, Math.min(480, startWidthRef.current + ev.clientX - startXRef.current));
      setSidebarWidth(newW);
    };
    const onUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [sidebarWidth]);

  // Handle proactive brain dump follow-ups creating new threads
  useEffect(() => {
    let cleanup: (() => void) | null = null;
    onBrainDumpFollowedUp(async (event) => {
      const thread = await addThread(
        event.content.slice(0, 60) + (event.content.length > 60 ? "\u2026" : ""),
        event.project_id,
        "main"
      );
      setActiveThread(thread);
    }).then((fn) => {
      cleanup = fn;
    });
    return () => {
      cleanup?.();
    };
  }, [addThread]);

  const handleNewThread = useCallback((projectId?: string) => {
    setNewThreadProjectId(projectId);
    setShowNewThread(true);
  }, []);

  const handleCreateThread = useCallback(
    async (name: string, projectId?: string) => {
      const thread = await addThread(name, projectId);
      setActiveThread(thread);
    },
    [addThread]
  );

  const handleCreateProject = useCallback(
    async (name: string, description?: string, color?: string) => {
      await addProject(name, description, color);
    },
    [addProject]
  );

  const handleDeleteThread = useCallback(
    async (thread: Thread) => {
      await removeThread(thread.id, thread.project_id);
      if (activeThread?.id === thread.id) {
        setActiveThread(null);
      }
    },
    [removeThread, activeThread]
  );

  const handleDeleteProject = useCallback(
    async (project: Project) => {
      await removeProject(project.id);
      if (activeThread?.project_id === project.id) {
        setActiveThread(null);
      }
    },
    [removeProject, activeThread]
  );

  const ThemeIcon =
    mode === "light" ? IconSun : mode === "dark" ? IconMoon : IconAdjustmentsHorizontal;

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "var(--color-surface)",
        overflow: "hidden",
        cursor: isResizing ? "col-resize" : undefined,
        userSelect: isResizing ? "none" : undefined,
      }}
    >
      {/* Left column: sidebar + brain dump */}
      <div
        style={{
          width: sidebarWidth,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid var(--color-border)",
        }}
      >
        <Sidebar
          width={sidebarWidth}
          projects={projects}
          standaloneThreads={standaloneThreads}
          projectThreads={projectThreads}
          activeThread={activeThread}
          onSelectThread={setActiveThread}
          onNewThread={handleNewThread}
          onNewProject={() => setShowNewProject(true)}
          onDeleteThread={handleDeleteThread}
          onDeleteProject={handleDeleteProject}
        />
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={startResize}
        style={{
          width: 5,
          flexShrink: 0,
          cursor: "col-resize",
          background: isResizing ? "var(--color-accent)" : "transparent",
          transition: "background 0.15s",
          position: "relative",
          zIndex: 10,
        }}
        onMouseEnter={(e) => {
          if (!isResizing) e.currentTarget.style.background = "var(--color-border)";
        }}
        onMouseLeave={(e) => {
          if (!isResizing) e.currentTarget.style.background = "transparent";
        }}
      />

      {/* Main area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        {/* Header bar */}
        <div
          data-tauri-drag-region
          style={{
            height: 52,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
            borderBottom: "1px solid var(--color-border)",
            background: "var(--color-surface)",
            flexShrink: 0,
            // @ts-ignore - webkit-app-region
            WebkitAppRegion: "drag",
            cursor: "default",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: "var(--color-text)",
              // @ts-ignore
              WebkitAppRegion: "no-drag",
            }}
          >
            OpenClaw Chat
          </div>
          <div
            style={{
              display: "flex",
              gap: 6,
              // @ts-ignore
              WebkitAppRegion: "no-drag",
            }}
          >
            <HeaderButton
              onClick={() => setShowBrainDump((b) => !b)}
              title="Brain Dump"
              active={showBrainDump}
            >
              <div style={{ position: "relative" }}>
                <IconBrain size={16} />
                {brainDumpOpenCount > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: -5,
                      right: -5,
                      width: 13,
                      height: 13,
                      background: "var(--color-accent)",
                      borderRadius: "50%",
                      fontSize: 9,
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      lineHeight: 1,
                    }}
                  >
                    {brainDumpOpenCount > 9 ? "9+" : brainDumpOpenCount}
                  </div>
                )}
              </div>
            </HeaderButton>
            <HeaderButton onClick={cycle} title={`Theme: ${mode}`}>
              <ThemeIcon size={16} />
            </HeaderButton>
            <HeaderButton onClick={() => setShowSettings(true)} title="Settings">
              <IconSettings size={16} />
            </HeaderButton>
          </div>
        </div>

        {/* Chat */}
        <ChatView
          thread={activeThread}
          isDark={isDark}
          onSent={touchThread}
        />
      </div>

      {/* Brain Dump right panel */}
      <div
        style={{
          width: showBrainDump ? 320 : 0,
          flexShrink: 0,
          borderLeft: showBrainDump ? "1px solid var(--color-border)" : "none",
          overflow: "hidden",
          transition: "width 0.2s ease",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ width: 320, display: "flex", flexDirection: "column", height: "100%" }}>
          {/* Panel header */}
          <div
            data-tauri-drag-region
            style={{
              height: 52,
              display: "flex",
              alignItems: "center",
              padding: "0 16px",
              borderBottom: "1px solid var(--color-border)",
              flexShrink: 0,
              // @ts-ignore
              WebkitAppRegion: "drag",
              cursor: "default",
            }}
          >
            <span
              style={{
                fontWeight: 600,
                fontSize: 14,
                color: "var(--color-text)",
                // @ts-ignore
                WebkitAppRegion: "no-drag",
              }}
            >
              Brain Dump
            </span>
          </div>
          <BrainDump
            projects={projects}
            onCreateThread={addThread}
            onSelectThread={(thread) => {
              setActiveThread(thread);
              setShowBrainDump(false);
            }}
            onOpenCountChange={setBrainDumpOpenCount}
          />
        </div>
      </div>

      {/* Modals */}
      {showNewThread && (
        <NewThreadModal
          projects={projects}
          defaultProjectId={newThreadProjectId}
          onClose={() => setShowNewThread(false)}
          onCreate={handleCreateThread}
        />
      )}
      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreate={handleCreateProject}
        />
      )}
      {showSettings && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          themeMode={mode}
          onThemeChange={setMode}
        />
      )}
    </div>
  );
}

function HeaderButton({
  children,
  onClick,
  title,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  active?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: active
          ? "var(--color-accent)"
          : hovered
          ? "var(--color-surface-2)"
          : "none",
        border: "1px solid var(--color-border)",
        borderRadius: 7,
        cursor: "pointer",
        color: active ? "#fff" : "var(--color-text-2)",
        width: 32,
        height: 32,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background 0.15s",
      }}
    >
      {children}
    </button>
  );
}
