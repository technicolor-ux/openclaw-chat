use crate::db::{get_proactive_brain_dumps, get_threads_needing_title_refresh, open_db, rename_thread, set_brain_dump_followed_up};
use crate::openclaw::{self, ChatMessage};
use anyhow::Result;
use chrono::{Local, Timelike};
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

/// Interval between proactive follow-up checks (configurable; default 4 hours)
const DEFAULT_INTERVAL_SECS: u64 = 4 * 60 * 60;

pub async fn run_proactive_loop(app: AppHandle, interval_secs: Option<u64>) {
    let interval = interval_secs.unwrap_or(DEFAULT_INTERVAL_SECS);
    loop {
        tokio::time::sleep(Duration::from_secs(interval)).await;
        if let Err(e) = process_proactive_items(&app).await {
            eprintln!("[proactive] Error: {}", e);
        }
    }
}

/// Nightly loop: checks every 60s, runs title refresh once at 23:55.
pub async fn run_title_refresh_loop(app: AppHandle) {
    let mut last_run_date: Option<chrono::NaiveDate> = None;
    loop {
        tokio::time::sleep(Duration::from_secs(60)).await;
        let now = Local::now();
        let today = now.date_naive();
        let hour = now.hour();
        let minute = now.minute();

        // Run at 23:55, once per day
        if hour == 23 && minute == 55 && last_run_date != Some(today) {
            last_run_date = Some(today);
            if let Err(e) = refresh_stale_titles(&app).await {
                eprintln!("[title-refresh] Error: {}", e);
            }
        }
    }
}

async fn refresh_stale_titles(app: &AppHandle) -> Result<()> {
    let conn = open_db()?;
    let threads = get_threads_needing_title_refresh(&conn)?;

    for thread in threads {
        let messages = openclaw::load_session(&thread.agent_id, &thread.session_id)?;
        if messages.is_empty() {
            continue;
        }
        match openclaw::generate_title_from_messages(&messages).await {
            Ok(title) => {
                rename_thread(&conn, &thread.id, &title)?;
                let _ = app.emit(
                    "thread:renamed",
                    serde_json::json!({ "threadId": thread.id, "name": title }),
                );
            }
            Err(e) => {
                eprintln!("[title-refresh] Failed for thread {}: {}", thread.id, e);
            }
        }
    }
    Ok(())
}

async fn process_proactive_items(app: &AppHandle) -> Result<()> {
    let conn = open_db()?;
    let items = get_proactive_brain_dumps(&conn)?;

    for item in items {
        let session_id = Uuid::new_v4().to_string();
        let prompt = format!(
            "I jotted this down earlier: '{}'. Do you have thoughts, or can you help me take a first step on it?",
            item.content
        );

        // Write user message
        let user_msg = ChatMessage {
            role: "user".to_string(),
            content: prompt.clone(),
        };
        openclaw::append_message("main", &session_id, &user_msg)?;

        match openclaw::send_and_capture("main", &prompt).await {
            Ok(response) => {
                // Write assistant response
                let assistant_msg = ChatMessage {
                    role: "assistant".to_string(),
                    content: response,
                };
                openclaw::append_message("main", &session_id, &assistant_msg)?;

                set_brain_dump_followed_up(&conn, &item.id)?;

                let _ = app.emit(
                    "braindump:followed_up",
                    serde_json::json!({
                        "brain_dump_id": item.id,
                        "session_id": session_id,
                        "content": item.content,
                        "project_id": item.project_id,
                    }),
                );
            }
            Err(e) => {
                eprintln!("[proactive] Failed to send for item {}: {}", item.id, e);
            }
        }
    }

    Ok(())
}
