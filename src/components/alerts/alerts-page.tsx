'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/components/auth/auth-provider';
import { fetchJson } from '@/lib/fetch';
import type { Alert } from '@/domain/types';

const STORAGE_KEY = 'finora-dismissed-alerts';

function alertKey(alert: Alert) {
  return `${alert.type}|${alert.title}|${alert.createdAt.slice(0, 10)}`;
}

function alertHref(type: string) {
  if (type.includes('REPAYMENT') || type.includes('INSTALLMENT') || type.includes('BALLOON')) return '/financing';
  if (type.includes('OBLIGATION')) return '/obligations';
  if (type.includes('SCENARIO')) return '/scenarios';
  if (type.includes('CASH')) return '/cash-flows';
  return '/';
}

export function AlertsPage() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'INFO'>('ALL');

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setDismissed(new Set(JSON.parse(raw)));
    } catch {
      /* ignore */
    }
    fetchJson<{ alerts: Alert[] }>('/api/alerts')
      .then((data) => setAlerts(data.alerts || []))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load alerts'))
      .finally(() => setLoading(false));
  }, []);

  function persist(next: Set<string>) {
    setDismissed(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    } catch {
      /* ignore */
    }
  }

  function dismiss(alert: Alert) {
    const next = new Set(dismissed);
    next.add(alertKey(alert));
    persist(next);
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-slate-100 rounded-xl" />)}
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

  const visible = alerts.filter((a) => !dismissed.has(alertKey(a)));
  const filtered = filter === 'ALL' ? visible : visible.filter((a) => a.severity === filter);
  const criticalCount = visible.filter((a) => a.severity === 'CRITICAL').length;
  const warningCount = visible.filter((a) => a.severity === 'WARNING').length;
  const infoCount = visible.filter((a) => a.severity === 'INFO').length;

  const severityStyles = {
    INFO: 'border-l-blue-500 bg-blue-50',
    WARNING: 'border-l-yellow-500 bg-yellow-50',
    CRITICAL: 'border-l-red-500 bg-red-50',
  };
  const severityDots = {
    INFO: 'bg-blue-500',
    WARNING: 'bg-yellow-500',
    CRITICAL: 'bg-red-500',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Alerts</h1>
          <p className="text-slate-500 mt-1">Monitor liquidity risks and upcoming obligations</p>
        </div>
        {visible.length > 0 && (
          <button className="btn-secondary" onClick={() => persist(new Set(alerts.map(alertKey)))}>Dismiss all</button>
        )}
      </div>

      {visible.length === 0 ? (
        <EmptyState title="No alerts" description="You're all caught up. Alerts will appear here when there are liquidity risks or upcoming obligations." />
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
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${severityDots[alert.severity]}`} />
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{alert.title}</p>
                    <p className="text-sm text-slate-600 mt-1">{alert.message}</p>
                    <p className="text-xs text-slate-400 mt-2">
                      {alert.type.replace(/_/g, ' ')} · {alert.createdAt.slice(0, 10)}
                    </p>
                    <div className="mt-2 flex gap-3">
                      <Link href={alertHref(alert.type)} className="text-xs font-semibold text-indigo-600 hover:underline">View {alertHref(alert.type).replace('/', '')}</Link>
                    </div>
                  </div>
                  <button
                    onClick={() => dismiss(alert)}
                    aria-label="Dismiss alert"
                    title="Dismiss"
                    className="text-slate-400 hover:text-slate-700"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
