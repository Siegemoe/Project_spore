/**
 * Consolidated loading state components
 * Replaces 8 separate loading functions with flexible parameterized components
 */

type LoadingType = "spinner" | "page" | "card" | "inline" | "overlay" | "table";
type SpinnerSize = "sm" | "md" | "lg";

interface LoadingProps {
  type?: LoadingType;
  size?: SpinnerSize;
  message?: string;
  count?: number;
  rows?: number;
  cols?: number;
  children?: React.ReactNode;
}

// Core spinner component
function Spinner({ size = "md" }: { size?: SpinnerSize }) {
  const sizeMap = { sm: "h-4 w-4", md: "h-8 w-8", lg: "h-12 w-12" };
  return (
    <div className="flex items-center justify-center">
      <div className={`${sizeMap[size]} animate-spin rounded-full border-2 border-border-subtle border-t-[rgb(var(--accent))]`} />
    </div>
  );
}

// Main loading component with variants
export function Loading({
  type = "spinner",
  size = "md",
  message,
  count = 3,
  rows = 5,
  cols = 4,
  children,
}: LoadingProps) {
  switch (type) {
    case "page":
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <Spinner size="lg" />
            <p className="text-text-secondary">{message || "Loading..."}</p>
          </div>
        </div>
      );

    case "card":
      return (
        <div className="card p-6 animate-pulse">
          <div className="space-y-3">
            <div className="h-4 bg-[rgb(var(--surface-muted))] rounded w-3/4"></div>
            <div className="h-4 bg-[rgb(var(--surface-muted))] rounded w-1/2"></div>
            <div className="h-4 bg-[rgb(var(--surface-muted))] rounded w-5/6"></div>
          </div>
        </div>
      );

    case "inline":
      return (
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Spinner size="sm" />
          <span>{message || "Loading..."}</span>
        </div>
      );

    case "overlay":
      return (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <Spinner size="lg" />
            {message && <p className="mt-4 text-sm text-text-secondary">{message}</p>}
          </div>
        </div>
      );

    case "table":
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

    default: // spinner
      return <Spinner size={size} />;
  }
}

// Convenience exports for backward compatibility
export const LoadingSpinner = (props: { size?: SpinnerSize }) => <Loading type="spinner" {...props} />;
export const LoadingPage = (props: { message?: string }) => <Loading type="page" {...props} />;
export const LoadingCard = () => <Loading type="card" />;
export const LoadingList = (props: { count?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: props.count || 3 }).map((_, i) => (
      <Loading key={i} type="card" />
    ))}
  </div>
);
export const LoadingButton = (props: { children?: React.ReactNode }) => (
  <button disabled className="btn opacity-60 cursor-not-allowed">
    <Loading type="spinner" size="sm" />
    <span className="ml-2">{props.children}</span>
  </button>
);
export const LoadingTable = (props: { rows?: number; cols?: number }) => (
  <Loading type="table" rows={props.rows} cols={props.cols} />
);
export const LoadingInline = (props: { text?: string }) => (
  <Loading type="inline" message={props.text} />
);
export const LoadingOverlay = (props: { message?: string }) => (
  <Loading type="overlay" {...props} />
);
