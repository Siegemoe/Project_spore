"use client";

import { useState, useCallback } from "react";
import { KanbanTask, KanbanColumnStatus } from "@/types";

interface DragItem {
  task: KanbanTask;
  sourceColumn: KanbanColumnStatus;
  sourceIndex: number;
}

export const useKanbanDragDrop = () => {
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<KanbanColumnStatus | null>(null);

  const handleDragStart = useCallback((
    task: KanbanTask,
    sourceColumn: KanbanColumnStatus,
    sourceIndex: number
  ) => {
    setDraggedItem({ task, sourceColumn, sourceIndex });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, columnId: KanbanColumnStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(columnId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  const handleDrop = useCallback((
    e: React.DragEvent,
    targetColumn: KanbanColumnStatus,
    targetIndex: number
  ) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedItem) return;

    const { task, sourceColumn, sourceIndex } = draggedItem;
    
    // Don't do anything if dropping in same position
    if (sourceColumn === targetColumn && sourceIndex === targetIndex) {
      setDraggedItem(null);
      return;
    }

    // Return the move operation for the parent component to handle
    const moveOperation = {
      task,
      from: {
        column: sourceColumn,
        index: sourceIndex,
      },
      to: {
        column: targetColumn,
        index: targetIndex,
      },
    };

    setDraggedItem(null);
    return moveOperation;
  }, [draggedItem]);

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
    setDragOverColumn(null);
  }, []);

  return {
    draggedItem,
    dragOverColumn,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
  };
};

export type DragDropReturn = ReturnType<typeof useKanbanDragDrop>;
export type { DragItem };
