export const Spinner = ({ className = 'h-5 w-5' }) => (
  <span className={`${className} animate-spin rounded-full border-2 border-blue-200 border-t-blue-600`} aria-label="Loading" />
);

export const Skeleton = ({ className = 'h-4 w-full' }) => (
  <div className={`${className} animate-pulse rounded bg-slate-100`} />
);

export const EmptyState = ({ icon, title, message, action }) => (
  <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
    {icon && <div className="text-slate-300">{icon}</div>}
    <h3 className="text-sm font-bold text-navy">{title}</h3>
    {message && <p className="max-w-sm text-xs text-slate-500">{message}</p>}
    {action}
  </div>
);

export const ErrorState = ({ title = 'Something went wrong', message, onRetry }) => (
  <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-rose-100 bg-rose-50/60 px-6 py-10 text-center">
    <h3 className="text-sm font-bold text-rose-700">{title}</h3>
    {message && <p className="max-w-sm text-xs text-rose-600">{message}</p>}
    {onRetry && (
      <button onClick={onRetry} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700">
        Try again
      </button>
    )}
  </div>
);

/** Banner for honest, labeled demo/fallback states (never fake success). */
export const NoticeBanner = ({ tone = 'amber', children }) => (
  <div
    className={`rounded-lg border px-3 py-2 text-xs font-medium ${
      tone === 'amber' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-blue-200 bg-blue-50 text-blue-800'
    }`}
  >
    {children}
  </div>
);
