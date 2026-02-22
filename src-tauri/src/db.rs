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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KanbanItem {
    pub id: String,
    pub project_id: Option<String>,
    pub source_type: String, // 'manual' | 'brain_dump' | 'research'
    pub source_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub column: String, // 'backlog' | 'this_week' | 'in_progress' | 'done'
    pub position: i32,
    pub status: String, // 'active' | 'archived'
    pub created_at: i64,
    pub updated_at: i64,
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

        CREATE TABLE IF NOT EXISTS kanban_items (
            id TEXT PRIMARY KEY,
            project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
            source_type TEXT NOT NULL DEFAULT 'manual',
            source_id TEXT,
            title TEXT NOT NULL,
            description TEXT,
            column TEXT NOT NULL DEFAULT 'backlog',
            position INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'active',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_threads_project ON threads(project_id);
        CREATE INDEX IF NOT EXISTS idx_threads_session ON threads(session_id);
        CREATE INDEX IF NOT EXISTS idx_brain_dumps_status ON brain_dumps(status);
        CREATE INDEX IF NOT EXISTS idx_brain_dumps_proactive ON brain_dumps(proactive);
        CREATE INDEX IF NOT EXISTS idx_kanban_project ON kanban_items(project_id);
        CREATE INDEX IF NOT EXISTS idx_kanban_column ON kanban_items(column);
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

    // Migration: settings table
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )",
    )?;

    // Migration: add obsidian_source column to projects
    let has_obsidian: bool = conn
        .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='projects'")?
        .query_row([], |row| row.get::<_, String>(0))
        .map(|sql| sql.contains("obsidian_source"))
        .unwrap_or(false);
    if !has_obsidian {
        conn.execute_batch("ALTER TABLE projects ADD COLUMN obsidian_source TEXT")?;
        conn.execute_batch(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_obsidian_source
             ON projects(obsidian_source) WHERE obsidian_source IS NOT NULL",
        )?;
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

pub fn get_project(conn: &Connection, id: &str) -> Result<Option<Project>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, description, color, agent_id, created_at, updated_at
         FROM projects WHERE id=?1",
    )?;
    let mut rows = stmt.query_map(params![id], |row| {
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
    Ok(rows.next().transpose()?)
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

// Settings

pub fn get_setting(conn: &Connection, key: &str) -> Result<Option<String>> {
    let mut stmt = conn.prepare("SELECT value FROM settings WHERE key=?1")?;
    let mut rows = stmt.query_map(params![key], |row| row.get::<_, String>(0))?;
    Ok(rows.next().transpose()?)
}

pub fn set_setting(conn: &Connection, key: &str, value: &str) -> Result<()> {
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        params![key, value],
    )?;
    Ok(())
}

// Obsidian sync

pub enum UpsertResult {
    Created,
    Updated,
    Skipped,
}

pub fn upsert_obsidian_project(
    conn: &Connection,
    name: &str,
    description: Option<&str>,
    color: &str,
    obsidian_source: &str,
) -> Result<UpsertResult> {
    let now = chrono::Utc::now().timestamp_millis();

    // Check if project with this obsidian_source already exists
    let existing: Option<(String, String, Option<String>, Option<String>)> = conn
        .prepare("SELECT id, name, description, color FROM projects WHERE obsidian_source=?1")?
        .query_row(params![obsidian_source], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
        })
        .ok();

    if let Some((id, old_name, old_desc, old_color)) = existing {
        // Check if anything changed
        if old_name == name
            && old_desc.as_deref() == description
            && old_color.as_deref() == Some(color)
        {
            return Ok(UpsertResult::Skipped);
        }
        conn.execute(
            "UPDATE projects SET name=?1, description=?2, color=?3, updated_at=?4 WHERE id=?5",
            params![name, description, color, now, id],
        )?;
        return Ok(UpsertResult::Updated);
    }

    // First sync: try to claim an existing project by name (no obsidian_source yet)
    let claimed: Option<String> = conn
        .prepare("SELECT id FROM projects WHERE name=?1 AND obsidian_source IS NULL")?
        .query_row(params![name], |row| row.get(0))
        .ok();

    if let Some(id) = claimed {
        conn.execute(
            "UPDATE projects SET description=?1, color=?2, obsidian_source=?3, updated_at=?4 WHERE id=?5",
            params![description, color, obsidian_source, now, id],
        )?;
        return Ok(UpsertResult::Updated);
    }

    // Create new
    let id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO projects (id, name, description, color, agent_id, obsidian_source, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, 'main', ?5, ?6, ?6)",
        params![id, name, description, color, obsidian_source, now],
    )?;
    Ok(UpsertResult::Created)
}

// Kanban items

pub fn create_kanban_item(conn: &Connection, item: &KanbanItem) -> Result<()> {
    conn.execute(
        "INSERT INTO kanban_items (id, project_id, source_type, source_id, title, description, column, position, status, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            item.id,
            item.project_id,
            item.source_type,
            item.source_id,
            item.title,
            item.description,
            item.column,
            item.position,
            item.status,
            item.created_at,
            item.updated_at,
        ],
    )?;
    Ok(())
}

pub fn list_kanban_items(conn: &Connection, project_id: Option<&str>) -> Result<Vec<KanbanItem>> {
    let query = if let Some(_pid) = project_id {
        "SELECT id, project_id, source_type, source_id, title, description, column, position, status, created_at, updated_at
         FROM kanban_items WHERE project_id=?1 AND status='active' ORDER BY column, position"
    } else {
        "SELECT id, project_id, source_type, source_id, title, description, column, position, status, created_at, updated_at
         FROM kanban_items WHERE status='active' ORDER BY column, position"
    };

    let mut stmt = conn.prepare(query)?;
    let rows = if let Some(pid) = project_id {
        stmt.query_map(params![pid], row_to_kanban_item)?
    } else {
        stmt.query_map([], row_to_kanban_item)?
    };

    let mut items = Vec::new();
    for row in rows {
        items.push(row?);
    }
    Ok(items)
}

fn row_to_kanban_item(row: &rusqlite::Row) -> rusqlite::Result<KanbanItem> {
    Ok(KanbanItem {
        id: row.get(0)?,
        project_id: row.get(1)?,
        source_type: row.get(2)?,
        source_id: row.get(3)?,
        title: row.get(4)?,
        description: row.get(5)?,
        column: row.get(6)?,
        position: row.get(7)?,
        status: row.get(8)?,
        created_at: row.get(9)?,
        updated_at: row.get(10)?,
    })
}

pub fn update_kanban_item(
    conn: &Connection,
    id: &str,
    title: Option<&str>,
    description: Option<&str>,
    column: Option<&str>,
    position: Option<i32>,
    status: Option<&str>,
) -> Result<()> {
    let now = chrono::Utc::now().timestamp_millis();

    // Build dynamic UPDATE query
    let mut updates = vec!["updated_at=?1".to_string()];
    let mut param_count = 2;

    let mut final_params: Vec<String> = vec![now.to_string()];

    if let Some(t) = title {
        updates.push(format!("title=?{}", param_count));
        final_params.push(t.to_string());
        param_count += 1;
    }
    if let Some(d) = description {
        updates.push(format!("description=?{}", param_count));
        final_params.push(d.to_string());
        param_count += 1;
    }
    if let Some(c) = column {
        updates.push(format!("column=?{}", param_count));
        final_params.push(c.to_string());
        param_count += 1;
    }
    if let Some(p) = position {
        updates.push(format!("position=?{}", param_count));
        final_params.push(p.to_string());
        param_count += 1;
    }
    if let Some(s) = status {
        updates.push(format!("status=?{}", param_count));
        final_params.push(s.to_string());
        param_count += 1;
    }

    let query = format!(
        "UPDATE kanban_items SET {} WHERE id=?{}",
        updates.join(", "),
        param_count
    );
    final_params.push(id.to_string());

    let mut stmt = conn.prepare(&query)?;
    let params_refs: Vec<&dyn rusqlite::ToSql> = final_params.iter().map(|p| p as &dyn rusqlite::ToSql).collect();
    stmt.execute(params_refs.as_slice())?;

    Ok(())
}

pub fn delete_kanban_item(conn: &Connection, id: &str) -> Result<()> {
    conn.execute("DELETE FROM kanban_items WHERE id=?1", params![id])?;
    Ok(())
}
