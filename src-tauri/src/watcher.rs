use crate::openclaw::{parse_jsonl_line, session_path, ChatMessage};
use anyhow::Result;
use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};
use tokio::sync::mpsc;

#[derive(Clone, serde::Serialize)]
pub struct MessageEvent {
    pub session_id: String,
    pub message: ChatMessage,
}

pub struct WatcherState {
    watchers: HashMap<String, RecommendedWatcher>,
    file_offsets: Arc<Mutex<HashMap<String, u64>>>,
}

impl WatcherState {
    pub fn new() -> Self {
        Self {
            watchers: HashMap::new(),
            file_offsets: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

pub async fn watch_session(
    app: AppHandle,
    state: Arc<Mutex<WatcherState>>,
    agent_id: String,
    session_id: String,
) -> Result<()> {
    let path = session_path(&agent_id, &session_id);

    // Make sure parent directory exists
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    // Read any existing content first
    let initial_offset = if path.exists() {
        let content = std::fs::read_to_string(&path)?;
        let mut offset = 0u64;
        for line in content.lines() {
            offset += line.len() as u64 + 1;
            if let Some(msg) = parse_jsonl_line(line) {
                let _ = app.emit(
                    "chat:message",
                    MessageEvent {
                        session_id: session_id.clone(),
                        message: msg,
                    },
                );
            }
        }
        offset
    } else {
        0
    };

    {
        let mut offsets = state.lock().unwrap().file_offsets.lock().unwrap().clone();
        offsets.insert(session_id.clone(), initial_offset);
    }

    let file_offsets = {
        let guard = state.lock().unwrap();
        Arc::clone(&guard.file_offsets)
    };
    {
        let mut offsets = file_offsets.lock().unwrap();
        offsets.insert(session_id.clone(), initial_offset);
    }

    let (tx, mut rx) = mpsc::channel(32);
    let path_clone = path.clone();
    let session_id_clone = session_id.clone();

    let mut watcher = RecommendedWatcher::new(
        move |res: Result<Event, _>| {
            if res.is_ok() {
                let _ = tx.blocking_send(());
            }
        },
        Config::default(),
    )?;

    let watch_path = path.parent().unwrap_or(&path);
    watcher.watch(watch_path, RecursiveMode::NonRecursive)?;

    {
        let mut guard = state.lock().unwrap();
        guard.watchers.insert(session_id.clone(), watcher);
    }

    let app_clone = app.clone();
    let offsets_clone = Arc::clone(&file_offsets);

    tokio::spawn(async move {
        while rx.recv().await.is_some() {
            if !path_clone.exists() {
                continue;
            }

            let current_offset = {
                let offsets = offsets_clone.lock().unwrap();
                *offsets.get(&session_id_clone).unwrap_or(&0)
            };

            if let Ok(content) = std::fs::read_to_string(&path_clone) {
                let bytes = content.as_bytes();
                if bytes.len() as u64 <= current_offset {
                    continue;
                }
                let new_content = &content[current_offset as usize..];
                let mut new_offset = current_offset;

                for line in new_content.lines() {
                    new_offset += line.len() as u64 + 1;
                    if let Some(msg) = parse_jsonl_line(line) {
                        let _ = app_clone.emit(
                            "chat:message",
                            MessageEvent {
                                session_id: session_id_clone.clone(),
                                message: msg,
                            },
                        );
                    }
                }

                let mut offsets = offsets_clone.lock().unwrap();
                offsets.insert(session_id_clone.clone(), new_offset);
            }
        }
    });

    Ok(())
}

pub fn stop_watching(state: Arc<Mutex<WatcherState>>, session_id: &str) {
    let mut guard = state.lock().unwrap();
    guard.watchers.remove(session_id);
}
