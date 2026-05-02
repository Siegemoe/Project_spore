"use client";

import React, { Component, ReactNode } from "react";
import { ErrorDisplay } from "./ErrorBoundary";

interface KanbanErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface KanbanErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary specifically for the Kanban board component
 * Provides better UX for Kanban-related errors
 */
export class KanbanErrorBoundary extends Component<KanbanErrorBoundaryProps, KanbanErrorBoundaryState> {
  constructor(props: KanbanErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): KanbanErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Kanban Error Boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col h-full bg-[rgb(var(--surface))] items-center justify-center p-8">
          <ErrorDisplay
            type="fallback"
            error={this.state.error || undefined}
            message="Failed to load Kanban board. Please try refreshing the page."
            reset={() => this.setState({ hasError: false, error: null })}
          />
        </div>
      );
    }

    return this.props.children;
  }
}
