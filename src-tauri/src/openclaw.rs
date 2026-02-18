use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Stdio;

pub const OPENCLAW_PATH_ENV: &str = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

// ── JSONL file format (for reading persisted sessions) ───────────────────────

#[derive(Debug, Serialize, Deserialize)]
struct JsonlMessage {
    #[serde(rename = "type")]
    msg_type: String,
    message: Option<JsonlInner>,
}

#[derive(Debug, Serialize, Deserialize)]
struct JsonlInner {
    role: String,
    content: Vec<JsonlContent>,
}

#[derive(Debug, Serialize, Deserialize)]
struct JsonlContent {
    #[serde(rename = "type")]
    content_type: String,
    text: Option<String>,
}

// ── JSON stdout format from `openclaw agent --json` ──────────────────────────

#[derive(Debug, Deserialize)]
pub struct OpenClawOutput {
    pub payloads: Vec<Payload>,
}

#[derive(Debug, Deserialize)]
pub struct Payload {
    pub text: Option<String>,
}

// ── Paths ────────────────────────────────────────────────────────────────────

pub fn session_path(agent_id: &str, session_id: &str) -> PathBuf {
    let home = dirs::home_dir().unwrap_or_default();
    home.join(".openclaw")
        .join("agents")
        .join(agent_id)
        .join("sessions")
        .join(format!("{}.jsonl", session_id))
}

fn ensure_session_dir(agent_id: &str) -> Result<PathBuf> {
    let home = dirs::home_dir().unwrap_or_default();
    let dir = home
        .join(".openclaw")
        .join("agents")
        .join(agent_id)
        .join("sessions");
    std::fs::create_dir_all(&dir)?;
    Ok(dir)
}

// ── JSONL parsing ────────────────────────────────────────────────────────────

pub fn parse_jsonl_line(line: &str) -> Option<ChatMessage> {
    let parsed: JsonlMessage = serde_json::from_str(line).ok()?;
    if parsed.msg_type != "message" {
        return None;
    }
    let inner = parsed.message?;
    if inner.role != "user" && inner.role != "assistant" {
        return None;
    }
    let text = inner
        .content
        .into_iter()
        .filter_map(|c| if c.content_type == "text" { c.text } else { None })
        .collect::<Vec<_>>()
        .join("");
    if text.is_empty() {
        return None;
    }
    Some(ChatMessage {
        role: inner.role,
        content: text,
    })
}

pub fn load_session(agent_id: &str, session_id: &str) -> Result<Vec<ChatMessage>> {
    let path = session_path(agent_id, session_id);
    if !path.exists() {
        return Ok(Vec::new());
    }
    let content = std::fs::read_to_string(&path)?;
    let messages = content
        .lines()
        .filter_map(parse_jsonl_line)
        .collect();
    Ok(messages)
}

// ── Write messages to our own JSONL ──────────────────────────────────────────

pub fn append_message(agent_id: &str, session_id: &str, msg: &ChatMessage) -> Result<()> {
    use std::io::Write;
    ensure_session_dir(agent_id)?;
    let path = session_path(agent_id, session_id);
    let mut file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)?;
    let line = serde_json::json!({
        "type": "message",
        "message": {
            "role": msg.role,
            "content": [{"type": "text", "text": msg.content}]
        }
    });
    writeln!(file, "{}", serde_json::to_string(&line)?)?;
    Ok(())
}

// ── Send message and capture response ────────────────────────────────────────

/// Spawns openclaw, captures the JSON response from stdout, returns assistant text.
pub async fn send_and_capture(agent_id: &str, message: &str) -> Result<String> {
    let openclaw_bin = find_openclaw_binary()?;

    let output = tokio::process::Command::new(&openclaw_bin)
        .args([
            "agent", "--local", "--agent", agent_id,
            "--message", message, "--json",
        ])
        .env("PATH", OPENCLAW_PATH_ENV)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()?
        .wait_with_output()
        .await?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(anyhow!("OpenClaw error: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let parsed: OpenClawOutput = serde_json::from_str(&stdout)
        .map_err(|e| anyhow!("Failed to parse openclaw output: {} — raw: {}", e, &stdout[..stdout.len().min(200)]))?;

    let text = parsed
        .payloads
        .into_iter()
        .filter_map(|p| p.text)
        .collect::<Vec<_>>()
        .join("\n");

    if text.is_empty() {
        return Err(anyhow!("OpenClaw returned empty response"));
    }

    Ok(text)
}

// ── Find binary ──────────────────────────────────────────────────────────────

pub fn find_openclaw_binary() -> Result<PathBuf> {
    let candidates = [
        PathBuf::from("/usr/local/bin/openclaw"),
        PathBuf::from("/opt/homebrew/bin/openclaw"),
        dirs::home_dir()
            .unwrap_or_default()
            .join(".local/bin/openclaw"),
        dirs::home_dir()
            .unwrap_or_default()
            .join(".bun/bin/openclaw"),
    ];

    for path in &candidates {
        if path.exists() {
            return Ok(path.clone());
        }
    }

    if let Ok(output) = std::process::Command::new("which")
        .arg("openclaw")
        .env("PATH", OPENCLAW_PATH_ENV)
        .output()
    {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path.is_empty() {
                return Ok(PathBuf::from(path));
            }
        }
    }

    Err(anyhow!("openclaw binary not found"))
}
