export default function GlobalLoading() {
  return (
    <div className="container py-10">
      <div className="animate-pulse space-y-4 max-w-2xl">
        <div className="h-6 w-40 rounded bg-neutral-200" />
        <div className="h-4 w-64 rounded bg-neutral-200" />
        <div className="h-48 w-full rounded bg-neutral-200" />
        <div className="h-4 w-72 rounded bg-neutral-200" />
      </div>
    </div>
  );
}
