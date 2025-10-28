"use client";

import React, { Component, ReactNode } from "react";
import { logError } from "@/lib/error-handler";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Consolidated Error Boundary Component
 * Handles React errors and displays appropriate fallback UI
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logError(error, "error", { details: { componentStack: errorInfo.componentStack } });
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--bg-primary))]">
          <div className="max-w-md w-full card p-8 text-center space-y-4">
            <div className="text-4xl">⚠️</div>
            <h1 className="text-2xl font-bold text-text-primary">Something went wrong</h1>
            <p className="text-text-secondary">
              {process.env.NODE_ENV === "development" && this.state.error
                ? this.state.error.message
                : "We encountered an unexpected error. Please try refreshing the page."}
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => this.setState({ hasError: false, error: null })} className="btn">
                Try Again
              </button>
              <a href="/" className="btn btn-accent">
                Go Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

type ErrorDisplayType = "fallback" | "inline" | "api" | "field";

interface ErrorDisplayProps {
  type?: ErrorDisplayType;
  error?: Error | string;
  message?: string;
  reset?: () => void;
  retry?: () => void;
  isDev?: boolean;
}

/**
 * Unified error display component replaces ErrorFallback, InlineError, APIError, FieldError
 */
export function ErrorDisplay({
  type = "fallback",
  error,
  message,
  reset,
  retry,
  isDev = process.env.NODE_ENV === "development",
}: ErrorDisplayProps) {
  const errorMessage = error instanceof Error ? error.message : (error || message || "An error occurred");

  switch (type) {
    case "inline":
      return (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          <span>⚠️</span>
          <span>{isDev ? errorMessage : "An error occurred"}</span>
        </div>
      );

    case "api":
      return (
        <div className="card p-6 bg-red-50 border-red-200">
          <div className="flex items-start gap-3">
            <span className="text-2xl">❌</span>
            <div className="flex-1">
              <h3 className="font-semibold text-red-800 mb-2">Request Failed</h3>
              <p className="text-sm text-red-700">{isDev ? errorMessage : "Failed to process request"}</p>
            </div>
          </div>
          {retry && (
            <button onClick={retry} className="btn btn-sm mt-4">
              Try Again
            </button>
          )}
        </div>
      );

    case "field":
      return errorMessage ? <p className="text-xs text-red-600 mt-1">{errorMessage}</p> : null;

    default: // fallback
      return (
        <div className="card p-6 text-center space-y-4">
          <div className="text-2xl">⚠️</div>
          <div>
            <h3 className="font-semibold text-text-primary mb-2">Error</h3>
            <p className="text-sm text-text-secondary">{isDev ? errorMessage : "An error occurred"}</p>
          </div>
          {reset && (
            <button onClick={reset} className="btn btn-sm">
              Try Again
            </button>
          )}
        </div>
      );
  }
}

// Backward compatibility exports
export const ErrorFallback = (props: { error: Error; reset: () => void }) => (
  <ErrorDisplay type="fallback" error={props.error} reset={props.reset} />
);

export const InlineError = (props: { message: string }) => (
  <ErrorDisplay type="inline" message={props.message} />
);

export const APIError = (props: { error: string | Error; retry?: () => void }) => (
  <ErrorDisplay type="api" error={props.error} retry={props.retry} />
);

export const FieldError = (props: { message?: string }) => (
  <ErrorDisplay type="field" message={props.message} />
);
