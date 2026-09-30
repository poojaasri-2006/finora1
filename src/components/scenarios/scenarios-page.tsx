'use client';

import { useEffect, useState } from 'react';
import { formatMoney } from '@/domain/money';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/components/auth/auth-provider';
import { fetchJson } from '@/lib/fetch';
import type { Scenario } from '@/domain/types';

interface ScenarioResult {
  scenarioId: string;
  scenarioName: string;
  scenarioType: string;
  minimumCashCents: number;
  minimumCashDate: string | null;
  totalPressuredPeriods: number;
  totalShortfallCents: number;
  maxSafeRepaymentCents: number;
}

export function ScenariosPage() {
  const { user } = useAuth();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [results, setResults] = useState<ScenarioResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadScenarios() {
      try {
        const data = await fetchJson<{ scenarios: Scenario[] }>('/api/scenarios');
        setScenarios(data.scenarios || []);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load scenarios');
        setLoading(false);
      }
    }
    loadScenarios();
  }, []);

  async function runScenarios() {
    setRunning(true);
    setError(null);
    try {
      const data = await fetchJson<{ results: ScenarioResult[] }>('/api/scenarios/run', {
        method: 'POST',
      });
      setResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run scenarios');
    } finally {
      setRunning(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="h-4 bg-slate-200 rounded w-24 mb-2" />
              <div className="h-6 bg-slate-200 rounded w-32" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-700 font-medium">Error loading scenarios</h3>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Scenario Analysis</h1>
          <p className="text-slate-500 mt-1">Compare base case with downside scenarios</p>
        </div>
        <button onClick={runScenarios} disabled={running} className="btn-primary">
          {running ? 'Running...' : 'Run Scenarios'}
        </button>
      </div>

      {scenarios.length === 0 ? (
        <EmptyState
          title="No scenarios yet"
          description="Create scenarios to test how changes in revenue, expenses, or other factors affect your liquidity."
          actions={[{ label: 'Create a scenario', href: '#add' }]}
          icon="🔮"
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {scenarios.map((s) => (
              <div key={s.id} className="metric-card">
                <p className="text-sm text-slate-500">{s.name}</p>
                <p className="text-lg font-bold text-slate-900 mt-1">{s.type.replace(/_/g, ' ')}</p>
                <p className="text-xs text-slate-500 mt-1">{s.description}</p>
              </div>
            ))}
          </div>

          {results.length > 0 && (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <h2 className="text-lg font-semibold text-slate-900 p-4 border-b border-slate-200">Scenario Comparison</h2>
              <table className="financial-table">
                <thead>
                  <tr>
                    <th>Scenario</th>
                    <th className="text-right">Minimum Cash</th>
                    <th className="text-right">Pressured Periods</th>
                    <th className="text-right">Total Shortfall</th>
                    <th className="text-right">Max Safe Repayment</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.scenarioId}>
                      <td className="font-medium text-slate-900">{r.scenarioName}</td>
                      <td className={`text-right font-medium ${r.minimumCashCents < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                        {formatMoney(r.minimumCashCents, 'USD')}
                      </td>
                      <td className={`text-right ${r.totalPressuredPeriods > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {r.totalPressuredPeriods}
                      </td>
                      <td className="text-right text-red-600">{formatMoney(r.totalShortfallCents, 'USD')}</td>
                      <td className="text-right text-slate-900">{formatMoney(r.maxSafeRepaymentCents, 'USD')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
