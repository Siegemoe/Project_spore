"use client";

import React from "react";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { KanbanErrorBoundary } from "@/components/shared/KanbanErrorBoundary";
import { KanbanBoard as KanbanBoardType, KanbanTask, User } from "@/types";

// Mock data for demonstration
const mockUsers: User[] = [
  {
    id: "1",
    handle: "alice",
    display_name: "Alice Johnson",
    avatar_url: null,
    bio: "Product Manager",
    created_at: "2024-01-15T00:00:00Z",
    updated_at: "2024-01-15T00:00:00Z",
  },
  {
    id: "2", 
    handle: "bob",
    display_name: "Bob Smith",
    avatar_url: null,
    bio: "Frontend Developer",
    created_at: "2024-01-10T00:00:00Z",
    updated_at: "2024-01-10T00:00:00Z",
  },
  {
    id: "3",
    handle: "charlie",
    display_name: "Charlie Davis",
    avatar_url: null,
    bio: "Backend Developer",
    created_at: "2024-01-05T00:00:00Z",
    updated_at: "2024-01-05T00:00:00Z",
  },
];

const mockTasks: KanbanTask[] = [
  {
    id: "task-1",
    title: "Set up project repository",
    description: "Initialize Git repository and create basic project structure with README, package.json, and initial commit.",
    creator_id: "1",
    assigned_to: "2",
    project_id: "demo-project",
    status: "in_progress",
    position: 0,
    created_at: "2024-01-20T00:00:00Z",
    updated_at: "2024-01-20T00:00:00Z",
    creator: mockUsers[0],
    assignee: mockUsers[1],
  },
  {
    id: "task-2",
    title: "Design database schema",
    description: "Create database schema for users, projects, and tasks with proper relationships and indexing.",
    creator_id: "1",
    assigned_to: "3",
    project_id: "demo-project",
    status: "backlog",
    position: 1,
    created_at: "2024-01-19T00:00:00Z",
    updated_at: "2024-01-19T00:00:00Z",
    creator: mockUsers[0],
    assignee: mockUsers[2],
  },
  {
    id: "task-3",
    title: "Implement authentication system",
    description: "Add user authentication with JWT tokens, login/logout functionality, and session management.",
    creator_id: "1",
    assigned_to: null,
    project_id: "demo-project",
    status: "backlog",
    position: 2,
    created_at: "2024-01-18T00:00:00Z",
    updated_at: "2024-01-18T00:00:00Z",
    creator: mockUsers[0],
    assignee: undefined,
  },
  {
    id: "task-4",
    title: "Create API endpoints",
    description: "Develop REST API endpoints for user management, project operations, and task CRUD operations.",
    creator_id: "2",
    assigned_to: "1",
    project_id: "demo-project",
    status: "assigned",
    position: 0,
    created_at: "2024-01-17T00:00:00Z",
    updated_at: "2024-01-17T00:00:00Z",
    creator: mockUsers[1],
    assignee: mockUsers[0],
  },
  {
    id: "task-5",
    title: "Write documentation",
    description: "Create comprehensive API documentation with examples and setup instructions.",
    creator_id: "3",
    assigned_to: "2", 
    project_id: "demo-project",
    status: "in_review",
    position: 0,
    created_at: "2024-01-16T00:00:00Z",
    updated_at: "2024-01-16T00:00:00Z",
    creator: mockUsers[2],
    assignee: mockUsers[1],
  },
  {
    id: "task-6",
    title: "Deploy to production",
    description: "Deploy application to production environment with proper CI/CD pipeline configuration.",
    creator_id: "1",
    assigned_to: null,
    project_id: "demo-project", 
    status: "complete",
    position: 0,
    created_at: "2024-01-15T00:00:00Z",
    updated_at: "2024-01-15T00:00:00Z",
    creator: mockUsers[0],
    assignee: undefined,
  },
];

const mockBoard: KanbanBoardType = {
  id: "board-1",
  project_id: "demo-project",
  name: "Demo Project Kanban",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  columns: [
    {
      id: "assigned",
      title: "Assigned",
      tasks: mockTasks.filter(task => task.status === "assigned"),
    },
    {
      id: "in_progress",
      title: "In Progress", 
      tasks: mockTasks.filter(task => task.status === "in_progress"),
    },
    {
      id: "backlog",
      title: "Backlog",
      tasks: mockTasks.filter(task => task.status === "backlog"),
    },
    {
      id: "in_review",
      title: "In Review",
      tasks: mockTasks.filter(task => task.status === "in_review"),
    },
    {
      id: "complete",
      title: "Complete",
      tasks: mockTasks.filter(task => task.status === "complete"),
    },
  ],
};

// Mock API functions for demonstration
const mockApi = {
  updateTask: async (taskId: string, updates: any) => {
    console.log("Updating task:", taskId, updates);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true };
  },
  createTask: async (projectId: string, taskData: any) => {
    console.log("Creating task:", projectId, taskData);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true };
  },
};

export default function KanbanDemoPage() {
  return (
    <div className="min-h-screen bg-[rgb(var(--surface))]">
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Kanban Board Demo
          </h1>
          <p className="text-text-secondary text-lg max-w-2xl">
            This is a fully functional Kanban board with drag-and-drop task management. 
            Try dragging tasks between columns, clicking to view details, and editing task information.
          </p>
        </div>

        <KanbanErrorBoundary>
          <KanbanBoard
            board={mockBoard}
            onTaskUpdate={mockApi.updateTask}
            onTaskCreate={mockApi.createTask}
          />
        </KanbanErrorBoundary>

        <div className="mt-8 p-6 bg-[rgb(var(--surface-muted))] rounded-xl">
          <h2 className="text-xl font-semibold text-text-primary mb-4">
            Features
          </h2>
          <div className="grid md:grid-cols-2 gap-6 text-sm text-text-secondary">
            <div>
              <h3 className="font-medium text-text-primary mb-2">✅ Drag & Drop</h3>
              <p>Drag tasks between columns to change their status</p>
            </div>
            <div>
              <h3 className="font-medium text-text-primary mb-2">📝 Task Details</h3>
              <p>Click any task to view full details including creator, assignee, description, and connections</p>
            </div>
            <div>
              <h3 className="font-medium text-text-primary mb-2">✏️ Edit Tasks</h3>
              <p>Edit task title, description, and assignment directly from the detail view</p>
            </div>
            <div>
              <h3 className="font-medium text-text-primary mb-2">🔗 Task Connections</h3>
              <p>Visual indicators show related tasks and dependencies</p>
            </div>
            <div>
              <h3 className="font-medium text-text-primary mb-2">📊 Responsive Design</h3>
              <p>Works seamlessly on desktop and mobile devices</p>
            </div>
            <div>
              <h3 className="font-medium text-text-primary mb-2">🎨 Clean Interface</h3>
              <p>Black and white design matching your project&apos;s aesthetic</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
