import { inspect } from "util";

export type ErrorMetadata = Record<string, unknown>;

export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  readonly metadata?: ErrorMetadata;

  constructor(code: string, message: string, status: number, metadata?: ErrorMetadata) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.status = status;
    this.metadata = metadata;
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, metadata?: ErrorMetadata) {
    super("BAD_REQUEST", message, 400, metadata);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required.", metadata?: ErrorMetadata) {
    super("UNAUTHORIZED", message, 401, metadata);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action.", metadata?: ErrorMetadata) {
    super("FORBIDDEN", message, 403, metadata);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found.", metadata?: ErrorMetadata) {
    super("NOT_FOUND", message, 404, metadata);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource conflict.", metadata?: ErrorMetadata) {
    super("CONFLICT", message, 409, metadata);
  }
}

export class SupabaseError extends AppError {
  constructor(message: string, metadata?: ErrorMetadata) {
    super("SUPABASE_ERROR", message, 500, metadata);
  }
}

export class InternalServerError extends AppError {
  constructor(message = "Unexpected server error.", metadata?: ErrorMetadata) {
    super("INTERNAL_SERVER_ERROR", message, 500, metadata);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...("metadata" in error ? { metadata: (error as any).metadata } : {}),
    };
  }
  return { message: inspect(error) };
}
