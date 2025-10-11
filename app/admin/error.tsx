"use client";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--bg-primary))]">
      <div className="max-w-md w-full card p-8 text-center space-y-4">
        <div className="text-4xl">⚠️</div>
        <h1 className="text-2xl font-bold text-text-primary">Admin Error</h1>
        <p className="text-text-secondary">
          An error occurred while loading the admin dashboard.
        </p>
        <details className="text-sm text-left">
          <summary className="cursor-pointer text-text-secondary hover:text-text-primary">
            Error Details
          </summary>
          <pre className="mt-2 p-3 bg-[rgb(var(--surface-muted))] rounded text-xs overflow-auto">
            {error.message}
          </pre>
          {error.digest && (
            <p className="mt-2 text-xs text-text-secondary">
              Error ID: {error.digest}
            </p>
          )}
        </details>
        <div className="flex gap-3 justify-center">
          <button onClick={() => reset()} className="btn">
            Try Again
          </button>
          <a href="/" className="btn btn-accent">
            Back to Home
          </a>
        </div>
        <p className="text-xs text-text-secondary">
          If this persists, check that environment variables are configured correctly.
        </p>
      </div>
    </div>
  );
}
