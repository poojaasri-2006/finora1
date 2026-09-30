'use client';

import { useEffect, useState } from 'react';
import { formatMoney } from '@/domain/money';
import { formatDate } from '@/domain/dates';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/components/auth/auth-provider';
import { fetchJson } from '@/lib/fetch';
import type { BusinessObligation } from '@/domain/types';

export function ObligationsPage() {
  const { user } = useAuth();
  const [obligations, setObligations] = useState<BusinessObligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadObligations() {
      try {
        const data = await fetchJson<{ obligations: BusinessObligation[] }>('/api/obligations');
        setObligations(data.obligations || []);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load obligations');
        setLoading(false);
      }
    }
    loadObligations();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-64" />
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="space-y-3 p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-100 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-700 font-medium">Error loading obligations</h3>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }

  const totalPending = obligations
    .filter((o) => o.status === 'PENDING')
    .reduce((s, o) => s + o.amountCents, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Business Obligations</h1>
          <p className="text-slate-500 mt-1">Track payroll, taxes, vendor payments, and other obligations</p>
        </div>
        <button className="btn-primary">+ Add Obligation</button>
      </div>

      {obligations.length === 0 ? (
        <EmptyState
          title="No obligations yet"
          description="Add payroll, taxes, rent, and other recurring obligations to track your commitments."
          actions={[{ label: 'Add your first obligation', href: '#add' }]}
          icon="📋"
        />
      ) : (
        <>
          <div className="metric-card">
            <p className="text-sm text-slate-500">Total Pending Obligations</p>
            <p className="text-2xl font-bold text-slate-900">{formatMoney(totalPending, 'USD')}</p>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <table className="financial-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Due Date</th>
                  <th>Recurrence</th>
                  <th className="text-right">Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {obligations.map((ob) => (
                  <tr key={ob.id}>
                    <td className="font-medium text-slate-900">{ob.name}</td>
                    <td><span className="badge-neutral">{ob.type}</span></td>
                    <td className="text-slate-600">{formatDate(ob.dueDate)}</td>
                    <td className="text-slate-600">{ob.recurrence.replace(/_/g, ' ')}</td>
                    <td className="text-right font-medium text-slate-900">{formatMoney(ob.amountCents, 'USD')}</td>
                    <td>
                      <span className={ob.status === 'PENDING' ? 'badge-warning' : ob.status === 'PAID' ? 'badge-safe' : 'badge-neutral'}>
                        {ob.status}
                      </span>
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
