"use client";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: Props) {
  return (
    <html>
      <body>
        <div className="container py-10 space-y-4">
          <h1 className="hero-title">Something went wrong</h1>
          <p className="hero-subtitle">
            {error?.message || "An unexpected error occurred."}
          </p>
          {error?.digest && (
            <p className="text-xs text-neutral-500">Ref: {error.digest}</p>
          )}
          <button
            type="button"
            className="btn btn-accent"
            onClick={() => reset()}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
