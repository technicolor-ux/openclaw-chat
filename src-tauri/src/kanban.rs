use crate::db::{self, KanbanItem};
use chrono::Utc;
use uuid::Uuid;

pub fn list_kanban_items(conn: &rusqlite::Connection, project_id: Option<&str>) -> anyhow::Result<Vec<KanbanItem>> {
    db::list_kanban_items(conn, project_id)
}

pub fn create_kanban_item(
    conn: &rusqlite::Connection,
    title: String,
    project_id: Option<String>,
    description: Option<String>,
    column: Option<String>,
) -> anyhow::Result<KanbanItem> {
    let now = Utc::now().timestamp_millis();
    let item = KanbanItem {
        id: Uuid::new_v4().to_string(),
        project_id,
        source_type: "manual".to_string(),
        source_id: None,
        title,
        description,
        column: column.unwrap_or_else(|| "backlog".to_string()),
        position: 0,
        status: "active".to_string(),
        created_at: now,
        updated_at: now,
    };
    db::create_kanban_item(conn, &item)?;
    Ok(item)
}

pub fn update_kanban_item(
    conn: &rusqlite::Connection,
    id: String,
    title: Option<String>,
    description: Option<String>,
    column: Option<String>,
    position: Option<i32>,
    status: Option<String>,
) -> anyhow::Result<()> {
    db::update_kanban_item(
        conn,
        &id,
        title.as_deref(),
        description.as_deref(),
        column.as_deref(),
        position,
        status.as_deref(),
    )
}

pub fn delete_kanban_item(conn: &rusqlite::Connection, id: String) -> anyhow::Result<()> {
    db::delete_kanban_item(conn, &id)
}

pub fn promote_brain_dump(
    conn: &rusqlite::Connection,
    dump_id: String,
    title: String,
    project_id: Option<String>,
    column: Option<String>,
) -> anyhow::Result<KanbanItem> {
    let now = Utc::now().timestamp_millis();
    let item = KanbanItem {
        id: Uuid::new_v4().to_string(),
        project_id,
        source_type: "brain_dump".to_string(),
        source_id: Some(dump_id.clone()),
        title,
        description: None,
        column: column.unwrap_or_else(|| "backlog".to_string()),
        position: 0,
        status: "active".to_string(),
        created_at: now,
        updated_at: now,
    };
    db::create_kanban_item(conn, &item)?;
    // Mark the brain dump as done
    db::update_brain_dump_status(conn, &dump_id, "done")?;
    Ok(item)
}
