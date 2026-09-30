interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  status: 'safe' | 'warning' | 'critical' | 'neutral';
}

export function MetricCard({ title, value, subtitle, status }: MetricCardProps) {
  const statusStyles = {
    safe: 'border-safe-500 bg-safe-50',
    warning: 'border-warning-500 bg-warning-50',
    critical: 'border-critical-500 bg-critical-50',
    neutral: 'border-slate-200 bg-white',
  };

  const valueStyles = {
    safe: 'text-safe-700',
    warning: 'text-warning-700',
    critical: 'text-critical-700',
    neutral: 'text-slate-900',
  };

  return (
    <div className={`rounded-lg border-2 p-4 ${statusStyles[status]}`}>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className={`text-2xl font-bold mt-1 ${valueStyles[status]}`}>{value}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
}
