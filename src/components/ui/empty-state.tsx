import Link from 'next/link';

interface EmptyStateProps {
  title: string;
  description: string;
  actions?: { label: string; href: string }[];
  icon?: string;
}

export function EmptyState({ title, description, actions }: EmptyStateProps) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="7" height="7" rx="2" />
          <rect x="14" y="3" width="7" height="7" rx="2" />
          <rect x="3" y="14" width="7" height="7" rx="2" />
          <rect x="14" y="14" width="7" height="7" rx="2" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-500 max-w-md mx-auto mb-6">{description}</p>
      {actions && actions.length > 0 && (
        <div className="flex flex-wrap justify-center gap-3">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {action.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
