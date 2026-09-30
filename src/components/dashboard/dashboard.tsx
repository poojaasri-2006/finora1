'use client';

import { useEffect, useState } from 'react';
import { MetricCard } from './metric-card';
import { CashFlowChart } from './cash-flow-chart';
import { UpcomingObligationsTable } from './upcoming-obligations-table';
import { LiquidityRiskTable } from './liquidity-risk-table';
import { AlertsPanel } from './alerts-panel';
import { ProjectionSummary } from './projection-summary';
import { DashboardSkeleton } from './dashboard-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/components/auth/auth-provider';
import { useToast } from '@/components/ui/toast-provider';
import { fetchJson } from '@/lib/fetch';
import { formatMoney } from '@/domain/money';

interface DashboardData {
  projection: any;
  alerts: any[];
  obligations: any[];
  installments: any[];
  currency: string;
  minimumReserveCents: number;
  openingCashCents: number;
  organization: {
    id: string;
    name: string;
    baseCurrency: string;
  };
}

export function Dashboard() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const result = await fetchJson<DashboardData>('/api/dashboard', {
          timeout: 30000,
          retries: 2,
        });
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load dashboard';
          setError(message);
          setLoading(false);
          addToast('error', 'Failed to load dashboard', message);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [addToast]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-700 font-medium">Error loading dashboard</h3>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 text-sm text-red-700 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { projection, alerts, obligations, installments, currency, minimumReserveCents, openingCashCents } = data;
  const summary = projection.summary;

  // Check if there's any financial data
  const hasData = obligations.length > 0 || installments.length > 0 || data.projection.periods.length > 0;

  // Calculate upcoming repayments
  const today = new Date().toISOString().slice(0, 10);
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const in60Days = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const in90Days = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const repayments30 = installments
    .filter((i: any) => i.dueDate >= today && i.dueDate <= in30Days)
    .reduce((sum: number, i: any) => sum + i.totalPaymentCents, 0);
  const repayments60 = installments
    .filter((i: any) => i.dueDate >= today && i.dueDate <= in60Days)
    .reduce((sum: number, i: any) => sum + i.totalPaymentCents, 0);
  const repayments90 = installments
    .filter((i: any) => i.dueDate >= today && i.dueDate <= in90Days)
    .reduce((sum: number, i: any) => sum + i.totalPaymentCents, 0);

  // Next major obligation
  const upcomingObligations = obligations
    .filter((o: any) => o.status === 'PENDING' && o.dueDate >= today)
    .sort((a: any, b: any) => a.dueDate.localeCompare(b.dueDate));
  const nextObligation = upcomingObligations[0] ?? null;

  // Critical alerts count
  const criticalAlerts = alerts.filter((a: any) => a.severity === 'CRITICAL').length;
  const warningAlerts = alerts.filter((a: any) => a.severity === 'WARNING').length;

  // Show empty state if no financial data
  if (!hasData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome to CashShield</h1>
          <p className="text-slate-500 mt-1">
            {data.organization?.name || 'Your organization'} — Let&apos;s get you set up
          </p>
        </div>

        <EmptyState
          title="No financial data yet"
          description="Add your first loan, cash flow, or obligation to see your liquidity projection. Or load demo data to explore the application."
          actions={[
            { label: 'Add your first loan', href: '/financing' },
            { label: 'Add cash flow data', href: '/cash-flows' },
            { label: 'Set your cash reserve', href: '/settings' },
          ]}
        />

        {/* Load demo data button */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-blue-900">Want to explore with sample data?</p>
              <p className="text-sm text-blue-700 mt-1">
                Load demo data to see how CashShield works with realistic financial records.
              </p>
            </div>
            <button
              onClick={async () => {
                try {
                  const res = await fetch('/api/demo-data', { method: 'POST' });
                  if (res.ok) {
                    addToast('success', 'Demo data loaded', 'Sample financial records have been added to your organization.');
                    window.location.reload();
                  } else {
                    const data = await res.json();
                    addToast('error', 'Failed to load demo data', data.error);
                  }
                } catch (err) {
                  addToast('error', 'Failed to load demo data');
                }
              }}
              className="btn-primary"
            >
              Load demo data
            </button>
          </div>
        </div>

        {/* Show current cash and reserve even without data */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Current Cash"
            value={formatMoney(openingCashCents, currency)}
            subtitle="Starting balance"
            status="neutral"
          />
          <MetricCard
            title="Cash Reserve"
            value={formatMoney(minimumReserveCents, currency)}
            subtitle="Minimum safe level"
            status="neutral"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Liquidity Dashboard</h1>
        <p className="text-slate-500 mt-1">
          Projection period: {projection.startDate} to {projection.endDate} ({projection.periodType.toLowerCase()})
        </p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Current Cash"
          value={formatMoney(openingCashCents, currency)}
          subtitle="Starting balance"
          status="neutral"
        />
        <MetricCard
          title="Minimum Projected Cash"
          value={formatMoney(summary.minimumCashCents, currency)}
          subtitle={summary.minimumCashDate ? `On ${summary.minimumCashDate}` : 'No data'}
          status={summary.minimumCashCents < minimumReserveCents ? 'critical' : summary.minimumCashCents < minimumReserveCents * 1.2 ? 'warning' : 'safe'}
        />
        <MetricCard
          title="Cash Reserve"
          value={formatMoney(minimumReserveCents, currency)}
          subtitle="Minimum safe level"
          status="neutral"
        />
        <MetricCard
          title="Next Major Obligation"
          value={nextObligation ? formatMoney(nextObligation.amountCents, currency) : 'None'}
          subtitle={nextObligation ? `${nextObligation.name} (${nextObligation.dueDate})` : 'No upcoming obligations'}
          status={nextObligation && nextObligation.amountCents > minimumReserveCents * 0.5 ? 'warning' : 'neutral'}
        />
      </div>

      {/* Second row metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Repayments (30 days)"
          value={formatMoney(repayments30, currency)}
          subtitle="Financing payments due"
          status={repayments30 > openingCashCents * 0.3 ? 'warning' : 'neutral'}
        />
        <MetricCard
          title="Repayments (60 days)"
          value={formatMoney(repayments60, currency)}
          subtitle="Financing payments due"
          status="neutral"
        />
        <MetricCard
          title="Repayments (90 days)"
          value={formatMoney(repayments90, currency)}
          subtitle="Financing payments due"
          status="neutral"
        />
        <MetricCard
          title="Liquidity Risk Periods"
          value={summary.totalPressuredPeriods.toString()}
          subtitle={summary.totalPressuredPeriods > 0 ? 'Periods below reserve' : 'All periods safe'}
          status={summary.totalPressuredPeriods > 0 ? 'critical' : 'safe'}
        />
      </div>

      {/* Alerts summary */}
      {(criticalAlerts > 0 || warningAlerts > 0) && (
        <div className={`rounded-lg p-4 ${criticalAlerts > 0 ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'}`}>
          <div className="flex items-center gap-2">
            <span className="text-lg">{criticalAlerts > 0 ? '🚨' : '⚠️'}</span>
            <span className={`font-medium ${criticalAlerts > 0 ? 'text-red-700' : 'text-yellow-700'}`}>
              {criticalAlerts} critical alert{criticalAlerts !== 1 ? 's' : ''}, {warningAlerts} warning{warningAlerts !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      {/* Cash flow chart */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Cash Flow Projection</h2>
        <CashFlowChart projection={projection} currency={currency} />
      </div>

      {/* Projection summary */}
      <ProjectionSummary projection={projection} currency={currency} />

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Upcoming Obligations</h2>
          <UpcomingObligationsTable obligations={upcomingObligations.slice(0, 10)} currency={currency} />
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Liquidity Risk Periods</h2>
          <LiquidityRiskTable projection={projection} currency={currency} />
        </div>
      </div>

      {/* Alerts panel */}
      <AlertsPanel alerts={alerts.slice(0, 10)} currency={currency} />
    </div>
  );
}
