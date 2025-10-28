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
