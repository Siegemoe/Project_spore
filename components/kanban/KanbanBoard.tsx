"use client";

import React, { useState } from "react";
import { cn } from "@/lib/cn";
import type { KanbanBoard as KanbanBoardType, KanbanColumn as KanbanColumnType, KanbanTask, KanbanColumnStatus, KanbanTaskUpdateInput } from "@/types";
import { KanbanColumn } from "./KanbanColumn";
import { TaskDetailSheet } from "./TaskDetailSheet";
import { TaskEditForm } from "./TaskEditForm";

interface KanbanBoardProps {
  board: KanbanBoardType;
  onTaskUpdate: (taskId: string, updates: KanbanTaskUpdateInput) => void;
  onTaskCreate?: (projectId: string, task: Omit<KanbanTask, 'id' | 'created_at' | 'updated_at'>) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  board,
  onTaskUpdate,
  onTaskCreate,
}) => {
  const [selectedTask, setSelectedTask] = useState<KanbanTask | null>(null);
  const [editingTask, setEditingTask] = useState<KanbanTask | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);

  // Default columns for the board
  const defaultColumns: KanbanColumnType[] = [
    {
      id: "assigned",
      title: "Assigned",
      tasks: [],
    },
    {
      id: "in_progress", 
      title: "In Progress",
      tasks: [],
    },
    {
      id: "backlog",
      title: "Backlog", 
      tasks: [],
    },
    {
      id: "in_review",
      title: "In Review",
      tasks: [],
    },
    {
      id: "complete",
      title: "Complete",
      tasks: [],
    },
  ];

  const [columns, setColumns] = useState<KanbanColumnType[]>(() => {
    if (board.columns) {
      return board.columns;
    }
    return defaultColumns;
  });

  // Organize tasks into columns
  React.useEffect(() => {
    if (!board.columns) return;

    const newColumns = defaultColumns.map(column => ({
      ...column,
      tasks: board.columns?.find(col => col.id === column.id)?.tasks || [],
    }));

    setColumns(newColumns);
  }, [board.columns, defaultColumns]);

  const handleTaskMove = async (moveOperation: {
    task: KanbanTask;
    from: { column: string; index: number };
    to: { column: string; index: number };
  }) => {
    const { task, from, to } = moveOperation;
    
    // Store previous state for rollback
    const previousColumns = [...columns];
    
    try {
      // Optimistically update UI first
      setColumns(prevColumns => {
        const newColumns = [...prevColumns];
        
        // Remove task from source column
        const sourceColumn = newColumns.find(col => col.id === from.column);
        if (sourceColumn) {
          sourceColumn.tasks = sourceColumn.tasks.filter(t => t.id !== task.id);
        }
        
        // Add task to target column
        const targetColumn = newColumns.find(col => col.id === to.column);
        if (targetColumn) {
          const targetTasks = [...targetColumn.tasks];
          targetTasks.splice(to.index, 0, task);
          targetColumn.tasks = targetTasks;
        }
        
        return newColumns;
      });

      // Update task status and position
      await onTaskUpdate(task.id, {
        status: to.column as KanbanColumnStatus,
        position: to.index,
      });
    } catch (error) {
      // Rollback on error
      setColumns(previousColumns);
      console.error('Failed to move task:', error);
    }
  };

  const handleTaskClick = (task: KanbanTask) => {
    setSelectedTask(task);
    setIsDetailSheetOpen(true);
  };

  const handleTaskEdit = (task: KanbanTask) => {
    setIsDetailSheetOpen(false);
    setEditingTask(task);
    setIsEditFormOpen(true);
  };

  const handleDetailSheetClose = () => {
    setIsDetailSheetOpen(false);
    setSelectedTask(null);
  };

  const handleEditFormClose = () => {
    setIsEditFormOpen(false);
    setEditingTask(null);
  };

  const handleEditFormSave = async (updates: KanbanTaskUpdateInput) => {
    if (!editingTask) return;
    
    await onTaskUpdate(editingTask.id, updates);
    handleEditFormClose();
  };

  const handleEditFormSubmit = async (taskData: Omit<KanbanTask, 'id' | 'created_at' | 'updated_at'>) => {
    if (!onTaskCreate) return;
    
    await onTaskCreate(board.project_id, taskData);
    handleEditFormClose();
  };

  return (
    <div className="flex flex-col h-full bg-[rgb(var(--surface))]">
      {/* Board Header */}
      <div className="p-6 border-b border-border-subtle">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            {board.name}
          </h1>
          <p className="text-text-secondary">
            Drag and drop tasks between columns to organize your work
          </p>
        </div>
      </div>

      {/* Board Content */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex min-w-max px-6 py-4 gap-4">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              onTaskMove={handleTaskMove}
              onTaskClick={handleTaskClick}
              onTaskEdit={handleTaskEdit}
            />
          ))}
        </div>
      </div>

      {/* Task Detail Sheet */}
      {selectedTask && (
        <TaskDetailSheet
          task={selectedTask}
          isOpen={isDetailSheetOpen}
          onClose={handleDetailSheetClose}
          onEdit={handleTaskEdit}
        />
      )}

      {/* Task Edit Form */}
      {editingTask && (
        <TaskEditForm
          task={editingTask}
          isOpen={isEditFormOpen}
          onClose={handleEditFormClose}
          onSave={handleEditFormSave}
        />
      )}
    </div>
  );
};
