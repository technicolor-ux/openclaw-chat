import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export interface Project {
  id: string;
  name: string;
  description?: string;
  color?: string;
  agent_id: string;
  created_at: number;
  updated_at: number;
}

export interface Thread {
  id: string;
  project_id?: string;
  name: string;
  session_id: string;
  agent_id: string;
  created_at: number;
  updated_at: number;
  last_message_at?: number;
}

export interface BrainDump {
  id: string;
  content: string;
  project_id?: string;
  status: "open" | "in_progress" | "done";
  proactive: boolean;
  created_at: number;
  updated_at: number;
  followed_up_at?: number;
}

export interface KanbanItem {
  id: string;
  project_id?: string;
  source_type: "manual" | "brain_dump" | "research";
  source_id?: string;
  title: string;
  description?: string;
  column: "backlog" | "this_week" | "in_progress" | "done";
  position: number;
  status: "active" | "archived";
  created_at: number;
  updated_at: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SshConfig {
  host: string;
  port: number;
  user: string;
  key_path: string;
}

export interface MessageEvent {
  session_id: string;
  message: ChatMessage;
}

// Projects
export const listProjects = () => invoke<Project[]>("cmd_list_projects");
export const createProject = (name: string, description?: string, color?: string) =>
  invoke<Project>("cmd_create_project", { name, description, color });
export const updateProject = (id: string, name: string, description?: string, color?: string) =>
  invoke<void>("cmd_update_project", { id, name, description, color });
export const deleteProject = (id: string) => invoke<void>("cmd_delete_project", { id });

// Threads — Tauri v2 converts snake_case Rust params to camelCase for JS
export const listThreads = (projectId?: string) =>
  invoke<Thread[]>("cmd_list_threads", { projectId });
export const createThread = (name: string, projectId?: string, agentId?: string) =>
  invoke<Thread>("cmd_create_thread", { name, projectId, agentId });
export const renameThread = (id: string, name: string) =>
  invoke<void>("cmd_rename_thread", { id, name });
export const deleteThread = (id: string) => invoke<void>("cmd_delete_thread", { id });

// Chat
export const loadSession = (agentId: string, sessionId: string) =>
  invoke<ChatMessage[]>("cmd_load_session", { agentId, sessionId });
export const sendMessage = (
  threadId: string,
  agentId: string,
  sessionId: string,
  message: string
) => invoke<void>("cmd_send_message", { threadId, agentId, sessionId, message });
export const watchSession = (agentId: string, sessionId: string) =>
  invoke<void>("cmd_watch_session", { agentId, sessionId });
export const stopWatching = (sessionId: string) =>
  invoke<void>("cmd_stop_watching", { sessionId });

// Brain Dump
export const listBrainDumps = () => invoke<BrainDump[]>("cmd_list_brain_dumps");
export const createBrainDump = (content: string, projectId?: string) =>
  invoke<BrainDump>("cmd_create_brain_dump", { content, projectId });
export const updateBrainDumpStatus = (id: string, status: string) =>
  invoke<void>("cmd_update_brain_dump_status", { id, status });
export const setBrainDumpProactive = (id: string, proactive: boolean) =>
  invoke<void>("cmd_set_brain_dump_proactive", { id, proactive });
export const deleteBrainDump = (id: string) => invoke<void>("cmd_delete_brain_dump", { id });
export const convertDumpToThread = (
  dumpId: string,
  name: string,
  projectId?: string,
  agentId?: string
) => invoke<Thread>("cmd_convert_dump_to_thread", { dumpId, name, projectId, agentId });

// SSH
export const configureSsh = (config: SshConfig) =>
  invoke<void>("cmd_configure_ssh", { config });
export const getSshConfig = () => invoke<SshConfig>("cmd_get_ssh_config");
export const testSsh = () => invoke<string>("cmd_test_ssh");
export const sshStatus = () => invoke<string>("cmd_ssh_status");
export const setRemoteMode = (enabled: boolean) =>
  invoke<void>("cmd_set_remote_mode", { enabled });
export const getRemoteMode = () => invoke<boolean>("cmd_get_remote_mode");

// Settings
export const getSetting = (key: string) =>
  invoke<string | null>("cmd_get_setting", { key });
export const setSetting = (key: string, value: string) =>
  invoke<void>("cmd_set_setting", { key, value });

// Obsidian sync
export interface SyncResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}
export const syncObsidianVault = () => invoke<SyncResult>("cmd_sync_obsidian_vault");

// Events
export const onChatMessage = (cb: (event: MessageEvent) => void) =>
  listen<MessageEvent>("chat:message", (e) => cb(e.payload));

export const onThreadRenamed = (
  cb: (event: { threadId: string; name: string }) => void
) => listen("thread:renamed", (e: any) => cb(e.payload));

export const onBrainDumpFollowedUp = (
  cb: (event: {
    brain_dump_id: string;
    session_id: string;
    content: string;
    project_id?: string;
  }) => void
) => listen("braindump:followed_up", (e: any) => cb(e.payload));

export const onKanbanRefresh = (cb: () => void) =>
  listen("kanban:refresh", () => cb());

// Kanban
export const listKanbanItems = (projectId?: string) =>
  invoke<KanbanItem[]>("cmd_list_kanban_items", { projectId });
export const createKanbanItem = (
  title: string,
  projectId?: string,
  description?: string,
  column?: string
) => invoke<KanbanItem>("cmd_create_kanban_item", { title, projectId, description, column });
export const updateKanbanItem = (
  id: string,
  title?: string,
  description?: string,
  column?: string,
  position?: number,
  status?: string,
  projectId?: string | null
) => invoke<void>("cmd_update_kanban_item", { id, title, description, column, position, status, projectId });
export const deleteKanbanItem = (id: string) =>
  invoke<void>("cmd_delete_kanban_item", { id });
export const promoteBrainDump = (dumpId: string, title: string, projectId?: string, column?: string) =>
  invoke<KanbanItem>("cmd_promote_brain_dump", { dumpId, title, projectId, column });
