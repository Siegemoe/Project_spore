/**
 * Shared loading state components
 * Replaces duplicate loading skeletons across the app
 */

export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <div className="flex items-center justify-center">
      <div className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-border-subtle border-t-[rgb(var(--accent))]`} />
    </div>
  );
}

export function LoadingPage({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-text-secondary">{message}</p>
      </div>
    </div>
  );
}

export function LoadingCard() {
  return (
    <div className="card p-6 animate-pulse">
      <div className="space-y-3">
        <div className="h-4 bg-[rgb(var(--surface-muted))] rounded w-3/4"></div>
        <div className="h-4 bg-[rgb(var(--surface-muted))] rounded w-1/2"></div>
        <div className="h-4 bg-[rgb(var(--surface-muted))] rounded w-5/6"></div>
      </div>
    </div>
  );
}

export function LoadingList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <LoadingCard key={i} />
      ))}
    </div>
  );
}

export function LoadingButton({ children }: { children: React.ReactNode }) {
  return (
    <button disabled className="btn opacity-60 cursor-not-allowed">
      <LoadingSpinner size="sm" />
      <span className="ml-2">{children}</span>
    </button>
  );
}

export function LoadingTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-8 bg-[rgb(var(--surface-muted))] rounded flex-1"></div>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Inline loading state for async operations
 */
export function LoadingInline({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-text-secondary">
      <LoadingSpinner size="sm" />
      <span>{text}</span>
    </div>
  );
}

/**
 * Loading overlay for dialogs/modals
 */
export function LoadingOverlay({ message }: { message?: string }) {
  return (
    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 shadow-lg">
        <LoadingSpinner size="lg" />
        {message && <p className="mt-4 text-sm text-text-secondary">{message}</p>}
      </div>
    </div>
  );
}
