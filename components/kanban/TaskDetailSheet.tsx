"use client";

import React, { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";
import { KanbanTask, User, TaskConnection } from "@/types";

interface TaskDetailSheetProps {
  task: KanbanTask;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (task: KanbanTask) => void;
}

export const TaskDetailSheet: React.FC<TaskDetailSheetProps> = ({
  task,
  isOpen,
  onClose,
  onEdit,
}) => {
  const [isEditing, setIsEditing] = useState(false);

  const handleEdit = () => {
    setIsEditing(true);
    onEdit(task);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Sheet open={isOpen} onClose={onClose}>
      <div className="p-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-text-primary mb-2">
              {task.title}
            </h2>
            <div className="flex items-center text-text-secondary text-sm">
              Created {formatDate(task.created_at)}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleEdit}
            disabled={isEditing}
          >
            Edit Task
          </Button>
        </div>

        {/* Task Details */}
        <div className="space-y-6">
          {/* Task Creator */}
          <div className="flex items-center">
            <span className="text-text-secondary text-sm font-medium w-24">
              Creator:
            </span>
            <div className="flex items-center ml-3">
              <Avatar
                src={task.creator?.avatar_url}
                alt={task.creator?.display_name || task.creator?.handle || undefined}
                size="sm"
                className="mr-2"
              />
              <span className="text-text-primary">
                {task.creator?.display_name || task.creator?.handle}
              </span>
            </div>
          </div>

          {/* Assigned To */}
          <div className="flex items-center">
            <span className="text-text-secondary text-sm font-medium w-24">
              Assigned to:
            </span>
            <div className="flex items-center ml-3">
              {task.assignee ? (
                <>
                  <Avatar
                    src={task.assignee.avatar_url}
                    alt={task.assignee.display_name || task.assignee.handle || undefined}
                    size="sm"
                    className="mr-2"
                  />
                  <span className="text-text-primary">
                    {task.assignee.display_name || task.assignee.handle}
                  </span>
                </>
              ) : (
                <span className="text-text-secondary italic">Unassigned</span>
              )}
            </div>
          </div>

          {/* Task Description */}
          {task.description && (
            <div>
              <h3 className="text-text-secondary text-sm font-medium mb-2">
                Task Description:
              </h3>
              <div className="card p-4">
                <p className="text-text-primary whitespace-pre-wrap">
                  {task.description}
                </p>
              </div>
            </div>
          )}

          {/* Task Connections */}
          {task.connections && task.connections.length > 0 && (
            <div>
              <h3 className="text-text-secondary text-sm font-medium mb-2">
                Task Connections:
              </h3>
              <div className="space-y-2">
                {task.connections.map((connection) => (
                  <div
                    key={connection.id}
                    className="flex items-center p-3 card"
                  >
                    <div className="flex items-center mr-3">
                      <div className={cn(
                        "w-3 h-3 rounded-full mr-2",
                        connection.connection_type === "blocks" && "bg-red-500",
                        connection.connection_type === "depends_on" && "bg-yellow-500",
                        connection.connection_type === "related_to" && "bg-blue-500"
                      )} />
                      <span className="text-text-secondary text-sm capitalize">
                        {connection.connection_type.replace("_", " ")}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-text-primary">
                        {connection.to_task?.title}
                      </div>
                      <div className="text-text-secondary text-sm">
                        {connection.to_task?.assignee && (
                          <>
                            Assigned to: {connection.to_task.assignee.display_name || connection.to_task.assignee.handle}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-6 border-t border-border-subtle">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Sheet>
  );
};
