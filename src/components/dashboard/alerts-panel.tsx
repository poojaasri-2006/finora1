import type { Alert } from '@/domain/types';

interface AlertsPanelProps {
  alerts: Alert[];
  currency: string;
}

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  if (alerts.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Alerts</h2>
        <div className="text-center py-4">
          <span className="badge-safe">✓ No active alerts</span>
        </div>
      </div>
    );
  }

  const severityStyles = {
    INFO: 'border-l-blue-500 bg-blue-50',
    WARNING: 'border-l-yellow-500 bg-yellow-50',
    CRITICAL: 'border-l-red-500 bg-red-50',
  };

  const severityIcons = {
    INFO: 'ℹ️',
    WARNING: '⚠️',
    CRITICAL: '🚨',
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Alerts</h2>
      <div className="space-y-2">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`border-l-4 rounded-r-lg p-3 ${severityStyles[alert.severity]}`}
          >
            <div className="flex items-start gap-2">
              <span>{severityIcons[alert.severity]}</span>
              <div className="flex-1">
                <p className="font-medium text-slate-900 text-sm">{alert.title}</p>
                <p className="text-sm text-slate-600 mt-0.5">{alert.message}</p>
              </div>
              <span className="text-xs text-slate-400">{alert.createdAt.slice(0, 10)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
