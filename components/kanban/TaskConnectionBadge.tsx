"use client";

import React from "react";
import { cn } from "@/lib/cn";
import { TaskConnection } from "@/types";

interface TaskConnectionBadgeProps {
  connections: TaskConnection[];
  className?: string;
}

export const TaskConnectionBadge: React.FC<TaskConnectionBadgeProps> = ({
  connections,
  className = "",
}) => {
  if (!connections || connections.length === 0) {
    return null;
  }

  const getConnectionColor = (type: TaskConnection["connection_type"]) => {
    switch (type) {
      case "blocks":
        return "bg-red-500";
      case "depends_on":
        return "bg-yellow-500";
      case "related_to":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const getConnectionIcon = (type: TaskConnection["connection_type"]) => {
    switch (type) {
      case "blocks":
        return (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case "depends_on":
        return (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M13 2L3 14h9l9-12z" />
          </svg>
        );
      case "related_to":
        return (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 005.656 0l4-4a4 4 0 00-5.656 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className={cn("flex items-center", className)}>
      {connections.slice(0, 3).map((connection, index) => (
        <div
          key={connection.id}
          className={cn(
            "flex items-center mr-1",
            index > 0 && "-ml-1" // Overlap for multiple connections
          )}
          title={`${connection.connection_type.replace("_", " ")}: ${connection.to_task?.title || "Unknown Task"}`}
        >
          <div
            className={cn(
              "w-3 h-3 rounded-full border-2 border-white",
              getConnectionColor(connection.connection_type)
            )}
          >
            {getConnectionIcon(connection.connection_type)}
          </div>
        </div>
      ))}
      
      {connections.length > 3 && (
        <div className="flex items-center text-text-secondary text-xs ml-1">
          +{connections.length - 3}
        </div>
      )}
    </div>
  );
};
