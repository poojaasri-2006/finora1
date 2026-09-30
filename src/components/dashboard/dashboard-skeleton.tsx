export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="h-8 bg-slate-200 rounded w-64" />

      {/* Metrics skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="h-4 bg-slate-200 rounded w-24 mb-2" />
            <div className="h-8 bg-slate-200 rounded w-32 mb-1" />
            <div className="h-3 bg-slate-200 rounded w-20" />
          </div>
        ))}
      </div>

      {/* Second row skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="h-4 bg-slate-200 rounded w-24 mb-2" />
            <div className="h-8 bg-slate-200 rounded w-32 mb-1" />
            <div className="h-3 bg-slate-200 rounded w-20" />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="h-6 bg-slate-200 rounded w-48 mb-4" />
        <div className="h-80 bg-slate-100 rounded" />
      </div>

      {/* Tables skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="h-6 bg-slate-200 rounded w-48 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded" />
            ))}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="h-6 bg-slate-200 rounded w-48 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
