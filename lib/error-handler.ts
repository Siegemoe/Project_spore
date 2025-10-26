/**
 * Centralized error handling utilities
 * Provides consistent error handling across the application
 */

import { SupabaseError, BadRequestError, UnauthorizedError } from "./errors";

export type ErrorSeverity = "info" | "warning" | "error" | "critical";

export interface ErrorContext {
  userId?: string;
  endpoint?: string;
  action?: string;
  details?: Record<string, any>;
}

export interface ErrorResponse {
  error: string;
  message: string;
  code?: string;
  details?: any;
}

/**
 * Format error for user display
 * Hides sensitive information in production
 */
export function formatErrorForUser(error: Error | unknown): ErrorResponse {
  if (error instanceof BadRequestError) {
    return {
      error: "Bad Request",
      message: error.message,
      details: (error as any).context,
    };
  }

  if (error instanceof UnauthorizedError) {
    return {
      error: "Unauthorized",
      message: error.message || "Authentication required",
    };
  }

  if (error instanceof SupabaseError) {
    return {
      error: "Database Error",
      message: process.env.NODE_ENV === "production" 
        ? "An error occurred while processing your request"
        : error.message,
      code: (error as any).context?.code,
    };
  }

  // Generic error
  const err = error as Error;
  return {
    error: "Error",
    message: process.env.NODE_ENV === "production"
      ? "Something went wrong. Please try again."
      : err.message || "Unknown error",
  };
}

/**
 * Log error with context
 * In production, this would send to error tracking service (Sentry, etc.)
 */
export async function logError(
  error: Error | unknown,
  severity: ErrorSeverity = "error",
  context?: ErrorContext
) {
  const timestamp = new Date().toISOString();
  const errorInfo = {
    timestamp,
    severity,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context,
  };

  // Log to console
  console.error(`[${severity.toUpperCase()}] ${timestamp}:`, errorInfo);

  // In production, send to error tracking service
  if (process.env.NODE_ENV === "production" && process.env.SENTRY_DSN) {
    // await Sentry.captureException(error, { contexts: { custom: context } });
  }

  // Log critical errors as security events
  if (severity === "critical" && context?.userId) {
    try {
      const { logSecurityEvent } = await import("@/features/security/actions");
      await logSecurityEvent({
        event_type: "suspicious_activity",
        severity: "high",
        user_id: context.userId,
        details: {
          error_message: error instanceof Error ? error.message : String(error),
          ...context,
        },
      });
    } catch {
      // Ignore if security logging fails
    }
  }
}

/**
 * Handle error in API route
 * Returns appropriate HTTP response
 */
export function handleAPIError(error: Error | unknown): Response {
  const formatted = formatErrorForUser(error);
  
  // Determine status code
  let status = 500;
  if (error instanceof BadRequestError) status = 400;
  if (error instanceof UnauthorizedError) status = 401;
  
  // Log error
  logError(error, "error");
  
  return Response.json(formatted, { status });
}

/**
 * Try-catch wrapper with error logging
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: ErrorContext
): Promise<{ data?: T; error?: ErrorResponse }> {
  try {
    const data = await operation();
    return { data };
  } catch (error) {
    await logError(error, "error", context);
    return { error: formatErrorForUser(error) };
  }
}

/**
 * Client-side error display utility
 */
export function getErrorMessage(error: Error | unknown): string {
  if (!error) return "An error occurred";
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === "string") {
    return error;
  }
  
  if (typeof error === "object" && error !== null && "message" in error) {
    return String(error.message);
  }
  
  return "An unexpected error occurred";
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: Error | unknown): boolean {
  if (error instanceof BadRequestError) return false;
  if (error instanceof UnauthorizedError) return false;
  
  // Network errors and 5xx errors are retryable
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes("network") ||
           message.includes("timeout") ||
           message.includes("503") ||
           message.includes("502") ||
           message.includes("500");
  }
  
  return true;
}

/**
 * Error tracking configuration
 */
export const ERROR_CONFIG = {
  // Sentry configuration (when enabled)
  sentry: {
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    enabled: Boolean(process.env.SENTRY_DSN),
  },
  
  // Error log retention
  retention: {
    clientLogs: 7 * 24 * 60 * 60 * 1000, // 7 days
    serverLogs: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
} as const;
