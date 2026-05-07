export default function CategoriesLoading() {
  return (
    <div className="flex-1 w-full max-w-5xl mx-auto space-y-8">
      <div className="space-y-2">
        <div className="h-9 w-64 rounded-lg bg-muted animate-pulse" />
        <div className="h-4 w-80 rounded bg-muted/60 animate-pulse" />
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 space-y-5">
          <div className="h-5 w-40 rounded bg-muted animate-pulse" />
          <div className="space-y-3">
            <div className="h-4 w-28 rounded bg-muted/60 animate-pulse" />
            <div className="h-10 w-full rounded-lg bg-muted animate-pulse" />
          </div>
          <div className="space-y-3">
            <div className="h-4 w-32 rounded bg-muted/60 animate-pulse" />
            <div className="h-10 w-full rounded-lg bg-muted animate-pulse" />
            <div className="h-3 w-56 rounded bg-muted/40 animate-pulse" />
          </div>
          <div className="h-10 w-full rounded-lg bg-muted animate-pulse" />
        </div>

        <div className="lg:col-span-3 rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="h-5 w-40 rounded bg-muted animate-pulse" />
          <div className="space-y-3 pt-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border/50">
                <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                <div className="h-4 w-20 rounded bg-muted/60 animate-pulse" />
                <div className="h-6 w-24 rounded-full bg-muted/60 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
