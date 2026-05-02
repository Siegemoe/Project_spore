"use client";

import React, { Component, ReactNode } from "react";
import { ErrorDisplay } from "./ErrorBoundary";

interface FeedErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface FeedErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary specifically for the feed component
 * Provides better UX for feed-related errors
 */
export class FeedErrorBoundary extends Component<FeedErrorBoundaryProps, FeedErrorBoundaryState> {
  constructor(props: FeedErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): FeedErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Feed Error Boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="container py-8">
          <ErrorDisplay
            type="fallback"
            error={this.state.error || undefined}
            message="Failed to load feed. Please try refreshing the page."
            reset={() => this.setState({ hasError: false, error: null })}
          />
        </div>
      );
    }

    return this.props.children;
  }
}
