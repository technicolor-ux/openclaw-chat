import { useCallback, useEffect, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  closestCorners,
} from "@dnd-kit/core";
import { listKanbanItems, updateKanbanItem, type KanbanItem, type Thread, type Project } from "../lib/tauri";
import KanbanColumn from "./KanbanColumn";
import CardPopupModal from "./CardPopupModal";

interface Props {
  projectFilter: string | null;
  projects: Project[];
  onOpenThread: (thread: Thread) => void;
}

const COLUMNS = [
  { id: "backlog", label: "Backlog" },
  { id: "this_week", label: "This Week" },
  { id: "in_progress", label: "In Progress" },
  { id: "done", label: "Done" },
] as const;

export default function KanbanBoard({ projectFilter, projects, onOpenThread }: Props) {
  const [items, setItems] = useState<KanbanItem[]>([]);
  const [selectedCard, setSelectedCard] = useState<KanbanItem | null>(null);

  const refresh = useCallback(async () => {
    try {
      const allItems = await listKanbanItems(projectFilter || undefined);
      setItems(allItems);
    } catch (err) {
      console.error("Failed to load kanban items:", err);
    }
  }, [projectFilter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const draggedItemId = active.id as string;
    const targetColumnId = over.id as string;

    // Parse column ID (format: "column-{colId}" from KanbanColumn)
    const colMatch = targetColumnId.match(/^column-(.+)$/);
    if (!colMatch) return;

    const newColumn = colMatch[1] as KanbanItem["column"];
    const draggedItem = items.find((i) => i.id === draggedItemId);
    if (!draggedItem || draggedItem.column === newColumn) return;

    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i.id === draggedItemId ? { ...i, column: newColumn } : i))
    );

    // Persist to DB
    try {
      await updateKanbanItem(draggedItemId, undefined, undefined, newColumn);
    } catch (err) {
      console.error("Failed to update kanban item:", err);
      // Revert on error
      refresh();
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        background: "var(--color-surface)",
      }}
    >
      {/* Kanban board container */}
      <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div
          style={{
            display: "flex",
            gap: 16,
            padding: 16,
            overflowX: "auto",
            flex: 1,
            minWidth: 0,
          }}
        >
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              columnId={col.id}
              label={col.label}
              items={items.filter((i) => i.column === col.id)}
              projects={projects}
              onSelectCard={setSelectedCard}
              onRefresh={refresh}
            />
          ))}
        </div>
      </DndContext>

      {/* Card detail modal */}
      {selectedCard && (
        <CardPopupModal
          card={selectedCard}
          projects={projects}
          onClose={() => setSelectedCard(null)}
          onUpdate={(updated) => {
            setItems((prev) =>
              prev.map((i) => (i.id === updated.id ? updated : i))
            );
            setSelectedCard(updated);
          }}
          onOpenThread={onOpenThread}
          onRefresh={refresh}
        />
      )}
    </div>
  );
}
