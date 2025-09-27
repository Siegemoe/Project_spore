"use client";

/**
 * HeaderSkeleton
 * Mobile-first skeleton to prevent CLS while profile header data loads.
 * Use as a Suspense fallback or while fetching client-side.
 */
export default function HeaderSkeleton() {
  return (
    <section className="overflow-hidden rounded-2xl border border-border-subtle animate-pulse">
      {/* Banner */}
      <div className="relative h-24 w-full bg-[rgb(var(--surface-muted))]" />

      {/* Content */}
      <div className="bg-[rgb(var(--surface))] px-4 pb-4 pt-2 sm:px-6">
        <div className="-mt-10 flex items-start gap-4">
          {/* Avatar */}
          <div className="h-20 w-20 shrink-0 rounded-full border border-border-subtle bg-[rgb(var(--surface-muted))]" />

          <div className="min-w-0 flex-1">
            {/* Name row */}
            <div className="mb-2 h-6 w-40 rounded bg-[rgb(var(--surface-muted))]" />
            <div className="mb-3 h-4 w-28 rounded bg-[rgb(var(--surface-muted))]" />

            {/* Actions row */}
            <div className="flex items-center gap-2">
              <div className="h-8 w-24 rounded-md border border-border-subtle bg-[rgb(var(--surface-muted))]" />
              <div className="h-8 w-20 rounded-md border border-border-subtle bg-[rgb(var(--surface-muted))]" />
            </div>

            {/* Counters */}
            <div className="mt-4 flex items-center gap-4">
              <div className="h-4 w-24 rounded bg-[rgb(var(--surface-muted))]" />
              <div className="h-4 w-24 rounded bg-[rgb(var(--surface-muted))]" />
              <div className="h-4 w-20 rounded bg-[rgb(var(--surface-muted))]" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
