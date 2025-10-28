"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/cn";
import { KanbanTask, KanbanTaskUpdateInput, User } from "@/types";

interface TaskEditFormProps {
  task: KanbanTask;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: KanbanTaskUpdateInput) => void;
}

export const TaskEditForm: React.FC<TaskEditFormProps> = ({
  task,
  isOpen,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<KanbanTaskUpdateInput>({
    title: task.title,
    description: task.description || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title?.trim()) {
      newErrors.title = "Task title is required";
    }
    
    if (formData.title && formData.title.length > 200) {
      newErrors.title = "Task title must be less than 200 characters";
    }
    
    if (formData.description && formData.description.length > 2000) {
      newErrors.description = "Task description must be less than 2000 characters";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      setErrors({ general: "Failed to save task. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (
    field: keyof KanbanTaskUpdateInput,
    value: string
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  // Reset form when task changes or modal opens
  useEffect(() => {
    setFormData({
      title: task.title,
      description: task.description || "",
    });
    setErrors({});
    setIsSubmitting(false);
  }, [task, isOpen]);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Edit Task
          </h2>
          <p className="text-text-secondary text-sm">
            Make changes to the task details below.
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Task Title */}
        <div>
          <label htmlFor="title" className="block text-text-secondary text-sm font-medium mb-2">
            Task Title *
          </label>
          <Input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) => handleInputChange("title", e.target.value)}
            placeholder="Enter task title..."
            className={cn(
              errors.title && "border-red-500 focus:ring-red-500"
            )}
            disabled={isSubmitting}
            maxLength={200}
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-500">{errors.title}</p>
          )}
        </div>

        {/* Task Description */}
        <div>
          <label htmlFor="description" className="block text-text-secondary text-sm font-medium mb-2">
            Task Description
          </label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            placeholder="Enter task description..."
            rows={4}
            className={cn(
              errors.description && "border-red-500 focus:ring-red-500"
            )}
            disabled={isSubmitting}
            maxLength={2000}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-500">{errors.description}</p>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-border-subtle">
          <Button
            type="submit"
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            Save Changes
          </Button>
        </div>

        {/* General Error */}
        {errors.general && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{errors.general}</p>
          </div>
        )}
      </form>
    </div>
  );
};
