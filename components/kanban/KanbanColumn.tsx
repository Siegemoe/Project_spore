"use client";

import React from "react";
import { cn } from "@/lib/cn";
import { KanbanColumn, KanbanTask, KanbanColumnStatus } from "@/types";
import { KanbanTaskCard } from "./KanbanTask";
import { useKanbanDragDrop } from "./useKanbanDragDrop";

interface KanbanColumnProps {
  column: KanbanColumn;
  onTaskMove: (moveOperation: any) => void;
  onTaskClick: (task: KanbanTask) => void;
  onTaskEdit: (task: KanbanTask) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  onTaskMove,
  onTaskClick,
  onTaskEdit,
}) => {
  const {
    draggedItem,
    dragOverColumn,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
  } = useKanbanDragDrop();

  const handleTaskDragStart = (task: KanbanTask) => {
    handleDragStart(task, column.id, 0);
  };

  const handleTaskClick = (task: KanbanTask) => {
    onTaskClick(task);
  };

  const handleTaskEdit = (task: KanbanTask) => {
    onTaskEdit(task);
  };

  const handleDragOver = (e: React.DragEvent) => {
    handleDragOver(e, column.id);
  };

  const handleDragLeave = () => {
    handleDragLeave();
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    const moveOperation = handleDrop(e, column.id, index);
    if (moveOperation) {
      onTaskMove(moveOperation);
    }
  };

  const handleTaskDragEnd = () => {
    handleDragEnd();
  };

  const getTaskCount = () => {
    const count = column.tasks.length;
    if (count === 1) return "1 task";
    if (count === 0) return "0 tasks";
    return `${count} tasks`;
  };

  const getColumnColor = (status: KanbanColumnStatus) => {
    switch (status) {
      case "assigned":
        return "border-blue-200 bg-blue-50";
      case "in_progress":
        return "border-yellow-200 bg-yellow-50";
      case "backlog":
        return "border-gray-200 bg-gray-50";
      case "in_review":
        return "border-purple-200 bg-purple-50";
      case "complete":
        return "border-green-200 bg-green-50";
      default:
        return "border-gray-200 bg-gray-50";
    }
  };

  return (
    <div
      className={cn(
        "flex-1 min-w-0 border border-border-subtle rounded-xl bg-[rgb(var(--surface))]",
        getColumnColor(column.id),
        dragOverColumn === column.id && "ring-2 ring-accent ring-opacity-50"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Column Header */}
      <div className="p-4 border-b border-border-subtle">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-text-primary">
            {column.title}
          </h2>
          <span className="text-text-secondary text-sm">
            {getTaskCount()}
          </span>
        </div>
      </div>

      {/* Tasks Container */}
      <div className="p-2 min-h-[200px] space-y-2 overflow-y-auto max-h-[600px]">
        {column.tasks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-text-secondary italic">
              No tasks in this column
            </p>
            <p className="text-text-secondary text-sm mt-2">
              Drag tasks here to get started
            </p>
          </div>
        ) : (
          column.tasks.map((task, index) => (
            <KanbanTaskCard
              key={task.id}
              task={task}
              isDragging={draggedItem?.task.id === task.id}
              onDragStart={() => handleTaskDragStart(task)}
              onDragEnd={handleTaskDragEnd}
              onClick={() => handleTaskClick(task)}
            />
          ))
        )}
      </div>

      {/* Drop Zone Indicator */}
      {dragOverColumn === column.id && (
        <div className="absolute inset-0 bg-accent bg-opacity-10 rounded-xl pointer-events-none" />
      )}
    </div>
  );
};
