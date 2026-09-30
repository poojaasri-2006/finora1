'use client';

import { useEffect, useState } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/components/auth/auth-provider';
import { fetchJson } from '@/lib/fetch';
import type { Alert } from '@/domain/types';

export function AlertsPage() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'INFO'>('ALL');

  useEffect(() => {
    async function loadAlerts() {
      try {
        const data = await fetchJson<{ alerts: Alert[] }>('/api/alerts');
        setAlerts(data.alerts || []);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load alerts');
        setLoading(false);
      }
    }
    loadAlerts();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="h-4 bg-slate-200 rounded w-24 mb-2" />
              <div className="h-8 bg-slate-200 rounded w-32" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-700 font-medium">Error loading alerts</h3>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }

  const filtered = filter === 'ALL' ? alerts : alerts.filter((a) => a.severity === filter);
  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL').length;
  const warningCount = alerts.filter((a) => a.severity === 'WARNING').length;
  const infoCount = alerts.filter((a) => a.severity === 'INFO').length;

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Alerts</h1>
        <p className="text-slate-500 mt-1">Monitor liquidity risks and upcoming obligations</p>
      </div>

      {alerts.length === 0 ? (
        <EmptyState
          title="No alerts"
          description="You're all caught up! Alerts will appear here when there are liquidity risks or upcoming obligations."
          icon="🔔"
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border-2 border-red-500 bg-red-50 rounded-lg p-4">
              <p className="text-sm text-slate-500">Critical</p>
              <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
            </div>
            <div className="border-2 border-yellow-500 bg-yellow-50 rounded-lg p-4">
              <p className="text-sm text-slate-500">Warnings</p>
              <p className="text-2xl font-bold text-yellow-600">{warningCount}</p>
            </div>
            <div className="metric-card">
              <p className="text-sm text-slate-500">Informational</p>
              <p className="text-2xl font-bold text-slate-900">{infoCount}</p>
            </div>
          </div>

          <div className="flex gap-2">
            {(['ALL', 'CRITICAL', 'WARNING', 'INFO'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  filter === f ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {filtered.map((alert) => (
              <div key={alert.id} className={`border-l-4 rounded-r-lg p-4 ${severityStyles[alert.severity]}`}>
                <div className="flex items-start gap-3">
                  <span className="text-xl">{severityIcons[alert.severity]}</span>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{alert.title}</p>
                    <p className="text-sm text-slate-600 mt-1">{alert.message}</p>
                    <p className="text-xs text-slate-400 mt-2">
                      {alert.type.replace(/_/g, ' ')} • {alert.createdAt.slice(0, 10)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
