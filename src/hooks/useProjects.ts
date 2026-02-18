import { useCallback, useEffect, useState } from "react";
import {
  createProject,
  createThread,
  deleteProject,
  deleteThread,
  listProjects,
  listThreads,
  onThreadRenamed,
  updateProject,
  type Project,
  type Thread,
} from "../lib/tauri";

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [standaloneThreads, setStandaloneThreads] = useState<Thread[]>([]);
  const [projectThreads, setProjectThreads] = useState<Record<string, Thread[]>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [projs, standalone] = await Promise.all([
        listProjects(),
        listThreads(undefined),
      ]);
      setProjects(projs);
      setStandaloneThreads(standalone);

      // Load threads for each project
      const threadMap: Record<string, Thread[]> = {};
      await Promise.all(
        projs.map(async (p) => {
          threadMap[p.id] = await listThreads(p.id);
        })
      );
      setProjectThreads(threadMap);
    } catch (err) {
      console.error("Failed to load projects/threads:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Listen for thread:renamed events from backend
  useEffect(() => {
    let cleanup: (() => void) | null = null;
    onThreadRenamed(({ threadId, name }) => {
      const updateThread = (t: Thread) =>
        t.id === threadId ? { ...t, name } : t;
      setStandaloneThreads((prev) => prev.map(updateThread));
      setProjectThreads((prev) => {
        const next: Record<string, Thread[]> = {};
        for (const [pid, threads] of Object.entries(prev)) {
          next[pid] = threads.map(updateThread);
        }
        return next;
      });
    }).then((fn) => {
      cleanup = fn;
    });
    return () => {
      cleanup?.();
    };
  }, []);

  const addProject = useCallback(
    async (name: string, description?: string, color?: string) => {
      const project = await createProject(name, description, color);
      setProjects((prev) => [project, ...prev]);
      setProjectThreads((prev) => ({ ...prev, [project.id]: [] }));
      return project;
    },
    []
  );

  const editProject = useCallback(
    async (id: string, name: string, description?: string, color?: string) => {
      await updateProject(id, name, description, color);
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, name, description, color } : p))
      );
    },
    []
  );

  const removeProject = useCallback(async (id: string) => {
    await deleteProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setProjectThreads((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const addThread = useCallback(
    async (name: string, projectId?: string, agentId?: string) => {
      const thread = await createThread(name, projectId ?? undefined, agentId ?? undefined);
      if (projectId) {
        setProjectThreads((prev) => ({
          ...prev,
          [projectId]: [thread, ...(prev[projectId] ?? [])],
        }));
      } else {
        setStandaloneThreads((prev) => [thread, ...prev]);
      }
      return thread;
    },
    []
  );

  const removeThread = useCallback(async (id: string, projectId?: string) => {
    await deleteThread(id);
    if (projectId) {
      setProjectThreads((prev) => ({
        ...prev,
        [projectId]: (prev[projectId] ?? []).filter((t) => t.id !== id),
      }));
    } else {
      setStandaloneThreads((prev) => prev.filter((t) => t.id !== id));
    }
  }, []);

  // Called when a thread receives a new message, to push it to top
  const touchThread = useCallback((thread: Thread) => {
    const now = Date.now();
    const updated = { ...thread, last_message_at: now, updated_at: now };
    if (thread.project_id) {
      setProjectThreads((prev) => ({
        ...prev,
        [thread.project_id!]: [
          updated,
          ...(prev[thread.project_id!] ?? []).filter((t) => t.id !== thread.id),
        ],
      }));
    } else {
      setStandaloneThreads((prev) => [
        updated,
        ...prev.filter((t) => t.id !== thread.id),
      ]);
    }
  }, []);

  return {
    projects,
    standaloneThreads,
    projectThreads,
    loading,
    refresh,
    addProject,
    editProject,
    removeProject,
    addThread,
    removeThread,
    touchThread,
  };
}
