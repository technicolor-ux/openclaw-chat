use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use tokio::io::AsyncBufReadExt;
use tokio::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SshConfig {
    pub host: String,
    pub port: u16,
    pub user: String,
    pub key_path: String,
}

impl Default for SshConfig {
    fn default() -> Self {
        Self {
            host: "mac-mini.local".to_string(),
            port: 22,
            user: "clawdbot1".to_string(),
            key_path: "~/.ssh/id_ed25519".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ConnectionStatus {
    Disconnected,
    Connecting,
    Connected,
    Error(String),
}

pub struct SshSession {
    pub config: SshConfig,
    pub status: ConnectionStatus,
    session: Option<openssh::Session>,
}

impl SshSession {
    pub fn new() -> Self {
        Self {
            config: SshConfig::default(),
            status: ConnectionStatus::Disconnected,
            session: None,
        }
    }

    pub fn expand_path(path: &str) -> String {
        if path.starts_with("~/") {
            let home = dirs::home_dir().unwrap_or_default();
            format!("{}/{}", home.display(), &path[2..])
        } else {
            path.to_string()
        }
    }

    pub async fn connect(&mut self) -> Result<()> {
        self.status = ConnectionStatus::Connecting;

        let key_path = Self::expand_path(&self.config.key_path);
        let dest = format!(
            "ssh://{}@{}:{}",
            self.config.user, self.config.host, self.config.port
        );

        let session = openssh::Session::connect_mux(
            &dest,
            openssh::KnownHosts::Accept,
        )
        .await
        .map_err(|e| anyhow!("SSH connect failed: {}", e))?;

        self.session = Some(session);
        self.status = ConnectionStatus::Connected;
        Ok(())
    }

    pub async fn disconnect(&mut self) {
        if let Some(session) = self.session.take() {
            let _ = session.close().await;
        }
        self.status = ConnectionStatus::Disconnected;
    }

    pub async fn test_connection(&mut self) -> Result<String> {
        self.connect().await?;
        let output = self.exec("echo connected && hostname").await?;
        Ok(output)
    }

    pub async fn exec(&self, cmd: &str) -> Result<String> {
        let session = self.session.as_ref().ok_or_else(|| anyhow!("Not connected"))?;
        let output = session
            .command("sh")
            .arg("-c")
            .arg(cmd)
            .output()
            .await
            .map_err(|e| anyhow!("SSH exec failed: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(anyhow!("Remote command failed: {}", stderr));
        }
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    }

    pub async fn send_message_remote(
        &self,
        agent_id: &str,
        session_id: &str,
        message: &str,
    ) -> Result<()> {
        // Escape the message for shell
        let escaped = message.replace('\'', "'\\''");
        let cmd = format!(
            "openclaw agent --agent '{}' --session-id '{}' --message '{}'",
            agent_id, session_id, escaped
        );
        self.exec(&cmd).await?;
        Ok(())
    }

    pub async fn stream_session_file<F>(
        &self,
        agent_id: &str,
        session_id: &str,
        on_line: F,
    ) -> Result<()>
    where
        F: Fn(String) + Send + 'static,
    {
        let session = self.session.as_ref().ok_or_else(|| anyhow!("Not connected"))?;
        let path = format!(
            "~/.openclaw/agents/{}/sessions/{}.jsonl",
            agent_id, session_id
        );
        let cmd = format!("tail -f '{}'", path);

        let mut child = session
            .command("sh")
            .arg("-c")
            .arg(&cmd)
            .stdout(openssh::Stdio::piped())
            .spawn()
            .await
            .map_err(|e| anyhow!("Failed to start tail: {}", e))?;

        if let Some(stdout) = child.stdout().take() {
            let mut reader = tokio::io::BufReader::new(stdout).lines();
            tokio::spawn(async move {
                while let Ok(Some(line)) = reader.next_line().await {
                    if !line.is_empty() {
                        on_line(line);
                    }
                }
            });
        }

        Ok(())
    }

    pub async fn read_session_file(&self, agent_id: &str, session_id: &str) -> Result<String> {
        let path = format!(
            "~/.openclaw/agents/{}/sessions/{}.jsonl",
            agent_id, session_id
        );
        self.exec(&format!("cat '{}' 2>/dev/null || echo ''", path)).await
    }
}

pub type SharedSshSession = Arc<Mutex<SshSession>>;

pub fn new_shared_session() -> SharedSshSession {
    Arc::new(Mutex::new(SshSession::new()))
}
