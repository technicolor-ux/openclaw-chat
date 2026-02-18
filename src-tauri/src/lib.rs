#![allow(dead_code, unused_imports)]
mod db;
mod openclaw;
mod proactive;
mod ssh;
mod watcher;

use crate::db::*;
use crate::openclaw::{load_session, ChatMessage};
use crate::ssh::{new_shared_session, ConnectionStatus, SharedSshSession, SshConfig};
use crate::watcher::{watch_session, WatcherState};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager, State};
use uuid::Uuid;

// ── Shared state ──────────────────────────────────────────────────────────────

struct AppState {
    db: Arc<Mutex<rusqlite::Connection>>,
    watcher_state: Arc<Mutex<WatcherState>>,
    ssh_session: SharedSshSession,
    remote_mode: Arc<Mutex<bool>>,
}

// ── Project commands ──────────────────────────────────────────────────────────

#[tauri::command]
async fn cmd_list_projects(state: State<'_, AppState>) -> Result<Vec<Project>, String> {
    let conn = state.db.lock().unwrap();
    list_projects(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
async fn cmd_create_project(
    state: State<'_, AppState>,
    name: String,
    description: Option<String>,
    color: Option<String>,
) -> Result<Project, String> {
    let now = Utc::now().timestamp_millis();
    let project = Project {
        id: Uuid::new_v4().to_string(),
        name,
        description,
        color,
        agent_id: "main".to_string(),
        created_at: now,
        updated_at: now,
    };
    let conn = state.db.lock().unwrap();
    create_project(&conn, &project).map_err(|e| e.to_string())?;
    Ok(project)
}

#[tauri::command]
async fn cmd_update_project(
    state: State<'_, AppState>,
    id: String,
    name: String,
    description: Option<String>,
    color: Option<String>,
) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    update_project(&conn, &id, &name, description.as_deref(), color.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn cmd_delete_project(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    delete_project(&conn, &id).map_err(|e| e.to_string())
}

// ── Thread commands ───────────────────────────────────────────────────────────

#[tauri::command]
async fn cmd_list_threads(
    state: State<'_, AppState>,
    project_id: Option<String>,
) -> Result<Vec<Thread>, String> {
    let conn = state.db.lock().unwrap();
    list_threads(&conn, project_id.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
async fn cmd_create_thread(
    state: State<'_, AppState>,
    project_id: Option<String>,
    name: String,
    agent_id: Option<String>,
) -> Result<Thread, String> {
    let now = Utc::now().timestamp_millis();
    let thread = Thread {
        id: Uuid::new_v4().to_string(),
        project_id,
        name,
        session_id: Uuid::new_v4().to_string(),
        agent_id: agent_id.unwrap_or_else(|| "main".to_string()),
        created_at: now,
        updated_at: now,
        last_message_at: None,
    };
    let conn = state.db.lock().unwrap();
    create_thread(&conn, &thread).map_err(|e| e.to_string())?;
    Ok(thread)
}

#[tauri::command]
async fn cmd_delete_thread(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    delete_thread(&conn, &id).map_err(|e| e.to_string())
}

// ── Chat commands ─────────────────────────────────────────────────────────────

#[tauri::command]
async fn cmd_load_session(
    state: State<'_, AppState>,
    agent_id: String,
    session_id: String,
) -> Result<Vec<ChatMessage>, String> {
    let remote = *state.remote_mode.lock().unwrap();
    if remote {
        let ssh = state.ssh_session.lock().await;
        let content = ssh
            .read_session_file(&agent_id, &session_id)
            .await
            .map_err(|e| e.to_string())?;
        let messages = content
            .lines()
            .filter_map(openclaw::parse_jsonl_line)
            .collect();
        Ok(messages)
    } else {
        load_session(&agent_id, &session_id).map_err(|e| e.to_string())
    }
}

#[tauri::command]
async fn cmd_send_message(
    state: State<'_, AppState>,
    app: AppHandle,
    thread_id: String,
    agent_id: String,
    session_id: String,
    message: String,
) -> Result<(), String> {
    // Touch the thread to update last_message_at
    {
        let conn = state.db.lock().unwrap();
        touch_thread(&conn, &thread_id).map_err(|e| e.to_string())?;
    }

    let remote = *state.remote_mode.lock().unwrap();
    if remote {
        let ssh = state.ssh_session.lock().await;
        ssh.send_message_remote(&agent_id, &session_id, &message)
            .await
            .map_err(|e| e.to_string())?;
        return Ok(());
    }

    // Write user message to our JSONL file immediately
    let user_msg = openclaw::ChatMessage {
        role: "user".to_string(),
        content: message.clone(),
    };
    openclaw::append_message(&agent_id, &session_id, &user_msg)
        .map_err(|e| format!("Failed to write user message: {}", e))?;

    // Send to openclaw and capture stdout response
    let response_text = openclaw::send_and_capture(&agent_id, &message)
        .await
        .map_err(|e| e.to_string())?;

    // Write assistant response to our JSONL file
    let assistant_msg = openclaw::ChatMessage {
        role: "assistant".to_string(),
        content: response_text.clone(),
    };
    openclaw::append_message(&agent_id, &session_id, &assistant_msg)
        .map_err(|e| format!("Failed to write assistant message: {}", e))?;

    // Emit the assistant message to the frontend
    let _ = app.emit(
        "chat:message",
        watcher::MessageEvent {
            session_id: session_id.clone(),
            message: assistant_msg,
        },
    );

    Ok(())
}

#[tauri::command]
async fn cmd_watch_session(
    state: State<'_, AppState>,
    app: AppHandle,
    agent_id: String,
    session_id: String,
) -> Result<(), String> {
    let watcher_state = Arc::clone(&state.watcher_state);
    watch_session(app, watcher_state, agent_id, session_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn cmd_stop_watching(state: State<'_, AppState>, session_id: String) -> Result<(), String> {
    watcher::stop_watching(Arc::clone(&state.watcher_state), &session_id);
    Ok(())
}

// ── Brain Dump commands ───────────────────────────────────────────────────────

#[tauri::command]
async fn cmd_list_brain_dumps(state: State<'_, AppState>) -> Result<Vec<BrainDump>, String> {
    let conn = state.db.lock().unwrap();
    list_brain_dumps(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
async fn cmd_create_brain_dump(
    state: State<'_, AppState>,
    content: String,
    project_id: Option<String>,
) -> Result<BrainDump, String> {
    let now = Utc::now().timestamp_millis();
    let dump = BrainDump {
        id: Uuid::new_v4().to_string(),
        content,
        project_id,
        status: "open".to_string(),
        proactive: false,
        created_at: now,
        updated_at: now,
        followed_up_at: None,
    };
    let conn = state.db.lock().unwrap();
    create_brain_dump(&conn, &dump).map_err(|e| e.to_string())?;
    Ok(dump)
}

#[tauri::command]
async fn cmd_update_brain_dump_status(
    state: State<'_, AppState>,
    id: String,
    status: String,
) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    update_brain_dump_status(&conn, &id, &status).map_err(|e| e.to_string())
}

#[tauri::command]
async fn cmd_set_brain_dump_proactive(
    state: State<'_, AppState>,
    id: String,
    proactive: bool,
) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    set_brain_dump_proactive(&conn, &id, proactive).map_err(|e| e.to_string())
}

#[tauri::command]
async fn cmd_delete_brain_dump(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    delete_brain_dump(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
async fn cmd_convert_dump_to_thread(
    state: State<'_, AppState>,
    dump_id: String,
    project_id: Option<String>,
    name: String,
    agent_id: Option<String>,
) -> Result<Thread, String> {
    let now = Utc::now().timestamp_millis();
    let thread = Thread {
        id: Uuid::new_v4().to_string(),
        project_id,
        name,
        session_id: Uuid::new_v4().to_string(),
        agent_id: agent_id.unwrap_or_else(|| "main".to_string()),
        created_at: now,
        updated_at: now,
        last_message_at: None,
    };
    let conn = state.db.lock().unwrap();
    create_thread(&conn, &thread).map_err(|e| e.to_string())?;
    update_brain_dump_status(&conn, &dump_id, "in_progress").map_err(|e| e.to_string())?;
    Ok(thread)
}

// ── SSH commands ──────────────────────────────────────────────────────────────

#[tauri::command]
async fn cmd_configure_ssh(
    state: State<'_, AppState>,
    config: SshConfig,
) -> Result<(), String> {
    let mut ssh = state.ssh_session.lock().await;
    ssh.config = config;
    Ok(())
}

#[tauri::command]
async fn cmd_get_ssh_config(state: State<'_, AppState>) -> Result<SshConfig, String> {
    let ssh = state.ssh_session.lock().await;
    Ok(ssh.config.clone())
}

#[tauri::command]
async fn cmd_test_ssh(state: State<'_, AppState>) -> Result<String, String> {
    let mut ssh = state.ssh_session.lock().await;
    ssh.test_connection().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn cmd_ssh_status(state: State<'_, AppState>) -> Result<String, String> {
    let ssh = state.ssh_session.lock().await;
    let status = match &ssh.status {
        ConnectionStatus::Disconnected => "disconnected",
        ConnectionStatus::Connecting => "connecting",
        ConnectionStatus::Connected => "connected",
        ConnectionStatus::Error(_) => "error",
    };
    Ok(status.to_string())
}

#[tauri::command]
async fn cmd_set_remote_mode(
    state: State<'_, AppState>,
    enabled: bool,
) -> Result<(), String> {
    let mut mode = state.remote_mode.lock().unwrap();
    *mode = enabled;
    Ok(())
}

#[tauri::command]
async fn cmd_get_remote_mode(state: State<'_, AppState>) -> Result<bool, String> {
    Ok(*state.remote_mode.lock().unwrap())
}

// ── App entry point ───────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize database
    let conn = open_db().expect("Failed to open database");
    init_db(&conn).expect("Failed to initialize database");

    let app_state = AppState {
        db: Arc::new(Mutex::new(conn)),
        watcher_state: Arc::new(Mutex::new(WatcherState::new())),
        ssh_session: new_shared_session(),
        remote_mode: Arc::new(Mutex::new(false)),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            cmd_list_projects,
            cmd_create_project,
            cmd_update_project,
            cmd_delete_project,
            cmd_list_threads,
            cmd_create_thread,
            cmd_delete_thread,
            cmd_load_session,
            cmd_send_message,
            cmd_watch_session,
            cmd_stop_watching,
            cmd_list_brain_dumps,
            cmd_create_brain_dump,
            cmd_update_brain_dump_status,
            cmd_set_brain_dump_proactive,
            cmd_delete_brain_dump,
            cmd_convert_dump_to_thread,
            cmd_configure_ssh,
            cmd_get_ssh_config,
            cmd_test_ssh,
            cmd_ssh_status,
            cmd_set_remote_mode,
            cmd_get_remote_mode,
        ])
        .setup(|app| {
            // Start proactive loop in background
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                proactive::run_proactive_loop(app_handle, None).await;
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
