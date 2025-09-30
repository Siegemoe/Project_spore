import { NextResponse } from "next/server";
import {
  AppError,
  InternalServerError,
  isAppError,
  serializeError,
} from "@/lib/errors";

type SuccessPayload<T> = {
  success: true;
  data: T;
};

type ErrorPayload = {
  success: false;
  error: {
    code: string;
    message: string;
    metadata?: Record<string, unknown>;
  };
};

export function ok<T>(data: T, init?: ResponseInit) {
  const body: SuccessPayload<T> = { success: true, data };
  return NextResponse.json(body, init);
}

export function fail(error: AppError, init?: ResponseInit) {
  const body: ErrorPayload = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      ...(error.metadata ? { metadata: error.metadata } : {}),
    },
  };
  return NextResponse.json(body, { status: error.status, ...init });
}

export function handleApiError(error: unknown) {
  if (isAppError(error)) {
    return fail(error);
  }

  const fallback = new InternalServerError();
  // eslint-disable-next-line no-console
  console.error("Unhandled API error", serializeError(error));
  return fail(fallback);
}
