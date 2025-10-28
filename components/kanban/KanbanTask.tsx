"use client";

import React from "react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";
import { KanbanTask, User } from "@/types";

interface KanbanTaskProps {
  task: KanbanTask;
  isDragging?: boolean;
  onDragStart?: (task: KanbanTask) => void;
  onDragEnd?: () => void;
  onClick?: (task: KanbanTask) => void;
}

export const KanbanTaskCard: React.FC<KanbanTaskProps> = ({
  task,
  isDragging = false,
  onDragStart,
  onDragEnd,
  onClick,
}) => {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "move";
    onDragStart?.(task);
  };

  const handleClick = () => {
    onClick?.(task);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onClick={handleClick}
      className={cn(
        "card cursor-pointer transition-all duration-200 hover:shadow-md",
        isDragging && "opacity-50 scale-95 shadow-lg"
      )}
    >
      {/* Task Header */}
      <div className="flex items-start justify-between p-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-text-primary truncate">
            {task.title}
          </h3>
          {task.assignee && (
            <div className="flex items-center mt-2 text-text-secondary text-sm">
              <Avatar
                src={task.assignee.avatar_url}
                alt={task.assignee.display_name || task.assignee.handle}
                size="sm"
                className="mr-2"
              />
              <span className="truncate">
                {task.assignee.display_name || task.assignee.handle}
              </span>
            </div>
          )}
        </div>
        
        {/* Task connections indicator */}
        {task.connections && task.connections.length > 0 && (
          <div className="flex items-center text-text-secondary text-xs">
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 005.656 0l4-4a4 4 0 00-5.656 0z"
              />
            </svg>
            {task.connections.length}
          </div>
        )}
      </div>

      {/* Task description preview */}
      {task.description && (
        <div className="px-3 pb-3">
          <p className="text-text-secondary text-sm line-clamp-2">
            {task.description}
          </p>
        </div>
      )}
    </div>
  );
};
