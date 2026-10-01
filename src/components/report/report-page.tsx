'use client';

import { useEffect, useState } from 'react';
import { formatMoney } from '@/domain/money';
import { formatDate } from '@/domain/dates';
import { fetchJson } from '@/lib/fetch';
import type { Alert, BusinessObligation, FinancingAccount, ProjectionResult } from '@/domain/types';

interface ReportData {
  projection: ProjectionResult;
  alerts: Alert[];
  obligations: BusinessObligation[];
  financingAccounts: FinancingAccount[];
  currency: string;
  minimumReserveCents: number;
  openingCashCents: number;
  organization: { id: string; name: string; baseCurrency: string };
}

export function ReportPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<ReportData>('/api/dashboard')
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load report'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="space-y-6 animate-pulse"><div className="h-8 bg-slate-200 rounded w-64" /><div className="h-96 bg-slate-100 rounded-2xl" /></div>;
  if (error || !data) return <div className="bg-red-50 border border-red-200 rounded-lg p-4"><h3 className="text-red-700 font-medium">Could not build report</h3><p className="text-red-600 text-sm mt-1">{error}</p></div>;

  const money = (cents: number) => formatMoney(cents, data.currency);
  const visibleAlerts = data.alerts.filter((alert) => !alert.isDismissed);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3 d2-no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Liquidity Report</h1>
          <p className="text-slate-500 mt-1">Board-ready summary — print or save as PDF</p>
        </div>
        <div className="flex gap-2">
          <a href="/api/export/excel" className="btn-secondary">Download Excel</a>
          <button className="btn-primary" onClick={() => window.print()}>Print / Save PDF</button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="border-b border-slate-200 pb-4 mb-4">
          <h1 className="text-2xl font-bold text-slate-900">{data.organization.name}</h1>
          <p className="text-slate-500 text-sm mt-1">Cash-flow & repayment capacity report · generated {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} · {data.currency}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="metric-card"><p className="text-sm text-slate-500">Opening cash</p><p className="text-xl font-bold text-slate-900">{money(data.openingCashCents)}</p></div>
          <div className="metric-card"><p className="text-sm text-slate-500">Minimum projected</p><p className={`text-xl font-bold ${data.projection.summary.minimumCashCents < 0 ? 'text-red-600' : 'text-slate-900'}`}>{money(data.projection.summary.minimumCashCents)}</p></div>
          <div className="metric-card"><p className="text-sm text-slate-500">Minimum reserve</p><p className="text-xl font-bold text-slate-900">{money(data.minimumReserveCents)}</p></div>
          <div className="metric-card"><p className="text-sm text-slate-500">Pressured periods</p><p className={`text-xl font-bold ${data.projection.summary.totalPressuredPeriods > 0 ? 'text-red-600' : 'text-green-600'}`}>{data.projection.summary.totalPressuredPeriods}</p></div>
        </div>

        <h2 className="text-lg font-semibold text-slate-900 mb-3">Cash-flow projection</h2>
        <div className="overflow-x-auto mb-6">
          <table className="financial-table">
            <thead><tr><th>Period</th><th className="text-right">Opening</th><th className="text-right">Inflows</th><th className="text-right">Outflows</th><th className="text-right">Financing</th><th className="text-right">Closing</th><th className="text-right">Buffer</th><th className="text-right">Shortfall</th></tr></thead>
            <tbody>
              {data.projection.periods.map((p) => (
                <tr key={p.periodStart} className={p.isPressured ? 'bg-red-50' : ''}>
                  <td>{formatDate(p.periodStart)} – {formatDate(p.periodEnd)}</td>
                  <td className="text-right">{money(p.openingCashCents)}</td>
                  <td className="text-right text-green-600">{money(p.inflowsCents)}</td>
                  <td className="text-right text-red-600">{money(p.totalOutflowsCents)}</td>
                  <td className="text-right">{money(p.financingPaymentsCents)}</td>
                  <td className="text-right font-medium">{money(p.closingCashCents)}</td>
                  <td className={`text-right ${p.liquidityBufferCents < 0 ? 'text-red-600' : 'text-slate-600'}`}>{money(p.liquidityBufferCents)}</td>
                  <td className="text-right text-red-600">{p.cashShortfallCents > 0 ? money(p.cashShortfallCents) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="text-lg font-semibold text-slate-900 mb-3">Active alerts ({visibleAlerts.length})</h2>
        <div className="space-y-2 mb-6">
          {visibleAlerts.length === 0 ? <p className="text-sm text-slate-500">No active alerts.</p> : visibleAlerts.map((alert) => (
            <div key={alert.id} className="flex items-start gap-3 rounded-lg border border-slate-200 px-3 py-2">
              <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${alert.severity === 'CRITICAL' ? 'bg-red-500' : alert.severity === 'WARNING' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
              <div><p className="text-sm font-medium text-slate-900">{alert.title}</p><p className="text-xs text-slate-500">{alert.message}</p></div>
            </div>
          ))}
        </div>

        <h2 className="text-lg font-semibold text-slate-900 mb-3">Financing obligations</h2>
        <div className="overflow-x-auto mb-6">
          <table className="financial-table">
            <thead><tr><th>Name</th><th>Lender</th><th>Method</th><th className="text-right">Outstanding</th><th className="text-right">Rate</th><th>Matures</th></tr></thead>
            <tbody>
              {data.financingAccounts.map((account) => (
                <tr key={account.id}>
                  <td className="font-medium text-slate-900">{account.name}</td>
                  <td className="text-slate-600">{account.lender}</td>
                  <td className="text-slate-600">{account.repaymentMethod.replace(/_/g, ' ')}</td>
                  <td className="text-right">{money(account.outstandingPrincipalCents)}</td>
                  <td className="text-right">{(account.annualInterestRate * 100).toFixed(2)}%</td>
                  <td className="text-slate-600">{formatDate(account.maturityDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="text-lg font-semibold text-slate-900 mb-3">Upcoming obligations</h2>
        <div className="overflow-x-auto">
          <table className="financial-table">
            <thead><tr><th>Name</th><th>Type</th><th>Due</th><th className="text-right">Amount</th><th>Status</th></tr></thead>
            <tbody>
              {data.obligations.map((ob) => (
                <tr key={ob.id}>
                  <td className="font-medium text-slate-900">{ob.name}</td>
                  <td className="text-slate-600">{ob.type}</td>
                  <td className="text-slate-600">{formatDate(ob.dueDate)}</td>
                  <td className="text-right">{money(ob.amountCents)}</td>
                  <td><span className={ob.status === 'PENDING' ? 'badge-warning' : ob.status === 'PAID' ? 'badge-safe' : 'badge-neutral'}>{ob.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-slate-400 mt-6">Planning estimates based on recorded data. Not financial advice.</p>
      </div>
    </div>
  );
}
