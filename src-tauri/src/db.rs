use anyhow::Result;
use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub agent_id: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Thread {
    pub id: String,
    pub project_id: Option<String>,
    pub name: String,
    pub session_id: String,
    pub agent_id: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub last_message_at: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BrainDump {
    pub id: String,
    pub content: String,
    pub project_id: Option<String>,
    pub status: String,
    pub proactive: bool,
    pub created_at: i64,
    pub updated_at: i64,
    pub followed_up_at: Option<i64>,
}

pub fn db_path() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_default();
    home.join(".openclaw").join("chat").join("openclaw-chat.db")
}

pub fn open_db() -> Result<Connection> {
    let path = db_path();
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let conn = Connection::open(&path)?;
    conn.execute_batch("PRAGMA journal_mode=WAL;")?;
    Ok(conn)
}

pub fn init_db(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            color TEXT,
            agent_id TEXT NOT NULL DEFAULT 'main',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS threads (
            id TEXT PRIMARY KEY,
            project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            session_id TEXT UNIQUE NOT NULL,
            agent_id TEXT NOT NULL DEFAULT 'main',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            last_message_at INTEGER
        );

        CREATE TABLE IF NOT EXISTS brain_dumps (
            id TEXT PRIMARY KEY,
            content TEXT NOT NULL,
            project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
            status TEXT NOT NULL DEFAULT 'open',
            proactive INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            followed_up_at INTEGER
        );

        CREATE INDEX IF NOT EXISTS idx_threads_project ON threads(project_id);
        CREATE INDEX IF NOT EXISTS idx_threads_session ON threads(session_id);
        CREATE INDEX IF NOT EXISTS idx_brain_dumps_status ON brain_dumps(status);
        CREATE INDEX IF NOT EXISTS idx_brain_dumps_proactive ON brain_dumps(proactive);
        ",
    )?;

    // Migration: add title_updated_at column
    let has_col: bool = conn
        .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='threads'")?
        .query_row([], |row| row.get::<_, String>(0))
        .map(|sql| sql.contains("title_updated_at"))
        .unwrap_or(false);
    if !has_col {
        conn.execute_batch("ALTER TABLE threads ADD COLUMN title_updated_at INTEGER")?;
    }

    Ok(())
}

// Projects CRUD

pub fn create_project(conn: &Connection, project: &Project) -> Result<()> {
    conn.execute(
        "INSERT INTO projects (id, name, description, color, agent_id, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            project.id,
            project.name,
            project.description,
            project.color,
            project.agent_id,
            project.created_at,
            project.updated_at,
        ],
    )?;
    Ok(())
}

pub fn list_projects(conn: &Connection) -> Result<Vec<Project>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, description, color, agent_id, created_at, updated_at
         FROM projects ORDER BY updated_at DESC",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(Project {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            color: row.get(3)?,
            agent_id: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    })?;
    let mut projects = Vec::new();
    for p in rows {
        projects.push(p?);
    }
    Ok(projects)
}

pub fn update_project(conn: &Connection, id: &str, name: &str, description: Option<&str>, color: Option<&str>) -> Result<()> {
    let now = chrono::Utc::now().timestamp_millis();
    conn.execute(
        "UPDATE projects SET name=?1, description=?2, color=?3, updated_at=?4 WHERE id=?5",
        params![name, description, color, now, id],
    )?;
    Ok(())
}

pub fn delete_project(conn: &Connection, id: &str) -> Result<()> {
    conn.execute("DELETE FROM projects WHERE id=?1", params![id])?;
    Ok(())
}

// Threads CRUD

pub fn create_thread(conn: &Connection, thread: &Thread) -> Result<()> {
    conn.execute(
        "INSERT INTO threads (id, project_id, name, session_id, agent_id, created_at, updated_at, last_message_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            thread.id,
            thread.project_id,
            thread.name,
            thread.session_id,
            thread.agent_id,
            thread.created_at,
            thread.updated_at,
            thread.last_message_at,
        ],
    )?;
    Ok(())
}

pub fn list_threads(conn: &Connection, project_id: Option<&str>) -> Result<Vec<Thread>> {
    let (query, param): (String, Option<String>) = match project_id {
        Some(pid) => (
            "SELECT id, project_id, name, session_id, agent_id, created_at, updated_at, last_message_at
             FROM threads WHERE project_id=?1 ORDER BY last_message_at DESC, updated_at DESC".to_string(),
            Some(pid.to_string()),
        ),
        None => (
            "SELECT id, project_id, name, session_id, agent_id, created_at, updated_at, last_message_at
             FROM threads WHERE project_id IS NULL ORDER BY last_message_at DESC, updated_at DESC".to_string(),
            None,
        ),
    };

    let rows = if let Some(pid) = param {
        let mut stmt = conn.prepare(&query)?;
        let rows = stmt.query_map(params![pid], row_to_thread)?;
        rows.collect::<std::result::Result<Vec<_>, _>>()?
    } else {
        let mut stmt = conn.prepare(&query)?;
        let rows = stmt.query_map([], row_to_thread)?;
        rows.collect::<std::result::Result<Vec<_>, _>>()?
    };
    Ok(rows)
}

fn row_to_thread(row: &rusqlite::Row) -> rusqlite::Result<Thread> {
    Ok(Thread {
        id: row.get(0)?,
        project_id: row.get(1)?,
        name: row.get(2)?,
        session_id: row.get(3)?,
        agent_id: row.get(4)?,
        created_at: row.get(5)?,
        updated_at: row.get(6)?,
        last_message_at: row.get(7)?,
    })
}

pub fn get_thread_by_session(conn: &Connection, session_id: &str) -> Result<Option<Thread>> {
    let mut stmt = conn.prepare(
        "SELECT id, project_id, name, session_id, agent_id, created_at, updated_at, last_message_at
         FROM threads WHERE session_id=?1",
    )?;
    let mut rows = stmt.query_map(params![session_id], row_to_thread)?;
    Ok(rows.next().transpose()?)
}

pub fn touch_thread(conn: &Connection, thread_id: &str) -> Result<()> {
    let now = chrono::Utc::now().timestamp_millis();
    conn.execute(
        "UPDATE threads SET last_message_at=?1, updated_at=?1 WHERE id=?2",
        params![now, thread_id],
    )?;
    Ok(())
}

pub fn rename_thread(conn: &Connection, id: &str, name: &str) -> Result<()> {
    let now = chrono::Utc::now().timestamp_millis();
    conn.execute(
        "UPDATE threads SET name=?1, title_updated_at=?2, updated_at=?2 WHERE id=?3",
        params![name, now, id],
    )?;
    Ok(())
}

pub fn get_thread(conn: &Connection, id: &str) -> Result<Option<Thread>> {
    let mut stmt = conn.prepare(
        "SELECT id, project_id, name, session_id, agent_id, created_at, updated_at, last_message_at
         FROM threads WHERE id=?1",
    )?;
    let mut rows = stmt.query_map(params![id], row_to_thread)?;
    Ok(rows.next().transpose()?)
}

pub fn get_threads_needing_title_refresh(conn: &Connection) -> Result<Vec<Thread>> {
    let mut stmt = conn.prepare(
        "SELECT id, project_id, name, session_id, agent_id, created_at, updated_at, last_message_at
         FROM threads
         WHERE last_message_at IS NOT NULL
           AND (title_updated_at IS NULL OR last_message_at > title_updated_at)",
    )?;
    let rows = stmt.query_map([], row_to_thread)?;
    let mut threads = Vec::new();
    for t in rows {
        threads.push(t?);
    }
    Ok(threads)
}

pub fn delete_thread(conn: &Connection, id: &str) -> Result<()> {
    conn.execute("DELETE FROM threads WHERE id=?1", params![id])?;
    Ok(())
}

// Brain Dump CRUD

pub fn create_brain_dump(conn: &Connection, dump: &BrainDump) -> Result<()> {
    conn.execute(
        "INSERT INTO brain_dumps (id, content, project_id, status, proactive, created_at, updated_at, followed_up_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            dump.id,
            dump.content,
            dump.project_id,
            dump.status,
            dump.proactive as i32,
            dump.created_at,
            dump.updated_at,
            dump.followed_up_at,
        ],
    )?;
    Ok(())
}

pub fn list_brain_dumps(conn: &Connection) -> Result<Vec<BrainDump>> {
    let mut stmt = conn.prepare(
        "SELECT id, content, project_id, status, proactive, created_at, updated_at, followed_up_at
         FROM brain_dumps ORDER BY created_at DESC",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(BrainDump {
            id: row.get(0)?,
            content: row.get(1)?,
            project_id: row.get(2)?,
            status: row.get(3)?,
            proactive: row.get::<_, i32>(4)? != 0,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
            followed_up_at: row.get(7)?,
        })
    })?;
    let mut dumps = Vec::new();
    for d in rows {
        dumps.push(d?);
    }
    Ok(dumps)
}

pub fn get_proactive_brain_dumps(conn: &Connection) -> Result<Vec<BrainDump>> {
    let mut stmt = conn.prepare(
        "SELECT id, content, project_id, status, proactive, created_at, updated_at, followed_up_at
         FROM brain_dumps WHERE proactive=1 AND status='open' ORDER BY created_at ASC",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(BrainDump {
            id: row.get(0)?,
            content: row.get(1)?,
            project_id: row.get(2)?,
            status: row.get(3)?,
            proactive: row.get::<_, i32>(4)? != 0,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
            followed_up_at: row.get(7)?,
        })
    })?;
    let mut dumps = Vec::new();
    for d in rows {
        dumps.push(d?);
    }
    Ok(dumps)
}

pub fn update_brain_dump_status(conn: &Connection, id: &str, status: &str) -> Result<()> {
    let now = chrono::Utc::now().timestamp_millis();
    conn.execute(
        "UPDATE brain_dumps SET status=?1, updated_at=?2 WHERE id=?3",
        params![status, now, id],
    )?;
    Ok(())
}

pub fn set_brain_dump_followed_up(conn: &Connection, id: &str) -> Result<()> {
    let now = chrono::Utc::now().timestamp_millis();
    conn.execute(
        "UPDATE brain_dumps SET status='in_progress', followed_up_at=?1, updated_at=?1 WHERE id=?2",
        params![now, id],
    )?;
    Ok(())
}

pub fn set_brain_dump_proactive(conn: &Connection, id: &str, proactive: bool) -> Result<()> {
    let now = chrono::Utc::now().timestamp_millis();
    conn.execute(
        "UPDATE brain_dumps SET proactive=?1, updated_at=?2 WHERE id=?3",
        params![proactive as i32, now, id],
    )?;
    Ok(())
}

pub fn delete_brain_dump(conn: &Connection, id: &str) -> Result<()> {
    conn.execute("DELETE FROM brain_dumps WHERE id=?1", params![id])?;
    Ok(())
}
