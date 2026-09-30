'use client';

import { useEffect, useState } from 'react';
import { formatMoney } from '@/domain/money';
import { formatDate } from '@/domain/dates';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/components/auth/auth-provider';
import { fetchJson } from '@/lib/fetch';
import type { CashFlowEntry } from '@/domain/types';

export function CashFlowsPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<CashFlowEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'INFLOW' | 'OUTFLOW'>('ALL');

  useEffect(() => {
    async function loadEntries() {
      try {
        const data = await fetchJson<{ entries: CashFlowEntry[] }>('/api/cash-flows');
        setEntries(data.entries || []);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load cash flows');
        setLoading(false);
      }
    }
    loadEntries();
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
        <h3 className="text-red-700 font-medium">Error loading cash flows</h3>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }

  const filtered = filter === 'ALL' ? entries : entries.filter((e) => e.type === filter);
  const totalInflows = entries.filter((e) => e.type === 'INFLOW').reduce((s, e) => s + e.amountCents, 0);
  const totalOutflows = entries.filter((e) => e.type === 'OUTFLOW').reduce((s, e) => s + e.amountCents, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cash Flows</h1>
          <p className="text-slate-500 mt-1">Manage revenue, expenses, and recurring cash movements</p>
        </div>
        <button className="btn-primary">+ Add Cash Flow</button>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          title="No cash flow entries yet"
          description="Add revenue, expenses, and other cash movements to track your cash position."
          actions={[{ label: 'Add your first cash flow', href: '#add' }]}
          icon="💰"
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="metric-card">
              <p className="text-sm text-slate-500">Total Inflows</p>
              <p className="text-2xl font-bold text-green-600">{formatMoney(totalInflows, 'USD')}</p>
            </div>
            <div className="metric-card">
              <p className="text-sm text-slate-500">Total Outflows</p>
              <p className="text-2xl font-bold text-red-600">{formatMoney(totalOutflows, 'USD')}</p>
            </div>
            <div className="metric-card">
              <p className="text-sm text-slate-500">Net Cash Flow</p>
              <p className={`text-2xl font-bold ${totalInflows - totalOutflows >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatMoney(totalInflows - totalOutflows, 'USD')}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {(['ALL', 'INFLOW', 'OUTFLOW'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  filter === f ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f === 'ALL' ? 'All' : f === 'INFLOW' ? 'Inflows' : 'Outflows'}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <table className="financial-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Recurrence</th>
                  <th>Start Date</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => (
                  <tr key={entry.id}>
                    <td className="font-medium text-slate-900">{entry.name}</td>
                    <td><span className="badge-neutral">{entry.category.replace(/_/g, ' ')}</span></td>
                    <td>
                      <span className={entry.type === 'INFLOW' ? 'badge-safe' : 'badge-warning'}>
                        {entry.type}
                      </span>
                    </td>
                    <td className="text-slate-600">{entry.recurrence.replace(/_/g, ' ')}</td>
                    <td className="text-slate-600">{formatDate(entry.startDate)}</td>
                    <td className={`text-right font-medium ${entry.type === 'INFLOW' ? 'text-green-600' : 'text-red-600'}`}>
                      {entry.type === 'INFLOW' ? '+' : '-'}{formatMoney(entry.amountCents, 'USD')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
