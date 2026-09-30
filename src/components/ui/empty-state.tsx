import Link from 'next/link';

interface EmptyStateProps {
  title: string;
  description: string;
  actions?: { label: string; href: string }[];
  icon?: string;
}

export function EmptyState({ title, description, actions, icon = '📊' }: EmptyStateProps) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
      <div className="text-4xl mb-4">{icon}</div>
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
