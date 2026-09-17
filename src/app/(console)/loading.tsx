export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <div className="h-3 w-20 animate-pulse rounded bg-bg-subtle" />
        <div className="h-7 w-72 animate-pulse rounded bg-bg-subtle" />
        <div className="h-3.5 w-96 max-w-full animate-pulse rounded bg-bg-subtle" />
      </div>
      <div className="rounded-xl border border-border bg-bg-elevated">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-b-0">
            <div className="h-3 w-10 animate-pulse rounded bg-bg-subtle" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-2/3 animate-pulse rounded bg-bg-subtle" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-bg-subtle" />
            </div>
            <div className="h-3 w-12 animate-pulse rounded bg-bg-subtle" />
          </div>
        ))}
      </div>
    </div>
  );
}
