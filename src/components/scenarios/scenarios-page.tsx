'use client';

import { useEffect, useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid, Legend } from 'recharts';
import { generateProjection } from '@/domain/projection/engine';
import { calculateSafeBorrowingCapacity } from '@/domain/capacity/safe-borrowing';
import { generateSchedule } from '@/domain/schedule';
import { addMonths, todayISO } from '@/domain/dates';
import { formatMoney } from '@/domain/money';
import { DeleteButton } from '@/components/ui/delete-button';
import { useToast } from '@/components/ui/toast-provider';
import { useAuth } from '@/components/auth/auth-provider';
import { canCreate, canDelete } from '@/lib/roles';
import { useOrganizationCurrency } from '@/lib/use-organization-currency';
import { fetchJson } from '@/lib/fetch';
import type { BusinessObligation, CashFlowEntry, FinancingAccount, ProjectionResult, Scenario } from '@/domain/types';
import type { ScheduleEntry } from '@/domain/schedule';

interface StudioData {
  projection: ProjectionResult;
  obligations: BusinessObligation[];
  cashFlows: CashFlowEntry[];
  financingAccounts: FinancingAccount[];
  installments: ScheduleEntry[];
  currency: string;
  minimumReserveCents: number;
  openingCashCents: number;
  organization: { id: string; name: string; baseCurrency: string };
}

const PRESETS = {
  base: { revenueDecline: 0, expenseIncrease: 0 },
  mild: { revenueDecline: 12, expenseIncrease: 5 },
  severe: { revenueDecline: 25, expenseIncrease: 12 },
};

export function ScenariosPage() {
  const { addToast } = useToast();
  const { user } = useAuth();
  const mayCreate = canCreate(user?.role);
  const mayDelete = canDelete(user?.role);
  const currency = useOrganizationCurrency();
  const [data, setData] = useState<StudioData | null>(null);
  const [saved, setSaved] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [revenueDecline, setRevenueDecline] = useState(0);
  const [expenseIncrease, setExpenseIncrease] = useState(0);
  const [newLoan, setNewLoan] = useState(0);
  const [newLoanRate, setNewLoanRate] = useState(9);
  const [newLoanTerm, setNewLoanTerm] = useState(36);
  const [name, setName] = useState('');

  useEffect(() => {
    Promise.all([
      fetchJson<StudioData>('/api/dashboard'),
      fetchJson<{ scenarios: Scenario[] }>('/api/scenarios').catch(() => ({ scenarios: [] })),
    ])
      .then(([dashboard, scenarios]) => {
        setData(dashboard);
        setSaved(scenarios.scenarios || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load scenario data'))
      .finally(() => setLoading(false));
  }, []);

  const projection = useMemo(() => {
    if (!data) return null;
    try {
      const today = todayISO();
      const newInstallments = newLoan > 0
        ? generateSchedule({
            principalCents: Math.round(newLoan * 100),
            annualRate: newLoanRate / 100,
            startDate: today,
            maturityDate: addMonths(today, newLoanTerm),
            frequency: 'MONTHLY',
            repaymentMethod: 'AMORTIZING',
            feesCents: 0,
            gracePeriodMonths: 0,
          }).map((entry) => ({ ...entry, financingAccountId: 'what-if' }))
        : [];
      return generateProjection({
        organizationId: data.organization.id,
        scenarioId: 'what-if',
        periodType: data.projection.periodType,
        startDate: data.projection.startDate,
        endDate: data.projection.endDate,
        openingCashCents: data.openingCashCents,
        minimumReserveCents: data.minimumReserveCents,
        cashFlows: data.cashFlows,
        obligations: data.obligations,
        financingSchedules: [...data.installments, ...newInstallments],
        scenario: {
          id: 'what-if',
          organizationId: data.organization.id,
          name: 'What-if',
          type: 'CUSTOM',
          description: '',
          adjustments: [
            ...(revenueDecline > 0 ? [{ id: 'a1', scenarioId: 'what-if', type: 'REVENUE_DECLINE', value: revenueDecline / 100, isPercentage: true, description: 'Revenue decline' }] : []),
            ...(expenseIncrease > 0 ? [{ id: 'a2', scenarioId: 'what-if', type: 'EXPENSE_INCREASE', value: expenseIncrease / 100, isPercentage: true, description: 'Expense increase' }] : []),
          ],
          createdAt: '',
          updatedAt: '',
        } as Scenario,
      });
    } catch {
      return null;
    }
  }, [data, revenueDecline, expenseIncrease, newLoan, newLoanRate, newLoanTerm]);

  const capacityMaxSafe = useMemo(() => {
    if (!projection || !data) return 0;
    try {
      return calculateSafeBorrowingCapacity({
        projection,
        scenario: { id: 'what-if', organizationId: data.organization.id, name: 'What-if', type: 'CUSTOM', description: '', adjustments: [], createdAt: '', updatedAt: '' } as Scenario,
        minimumReserveCents: data.minimumReserveCents,
        projectionMonths: 12,
        stressLevel: revenueDecline > 0 ? 0.1 : 0,
        requiredCoverageRatio: 1.25,
        annualInterestRate: 0.08,
        loanTermMonths: 36,
      }).maxSafeMonthlyRepaymentCents;
    } catch {
      return 0;
    }
  }, [projection, data, revenueDecline]);

  async function saveScenario() {
    if (!name.trim()) {
      addToast('error', 'Name your scenario first');
      return;
    }
    try {
      const response = await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          type: revenueDecline >= 20 || expenseIncrease >= 10 ? 'SEVERE_DOWNSIDE' : 'MILD_DOWNSIDE',
          description: `Revenue ${revenueDecline}% down, expenses ${expenseIncrease}% up${newLoan > 0 ? `, new loan ${formatMoney(newLoan * 100, currency)}` : ''}`,
          revenueDeclinePercent: revenueDecline,
          expenseIncreasePercent: expenseIncrease,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not save');
      setSaved((current) => [...current, body.scenario]);
      setName('');
      addToast('success', 'Scenario saved');
    } catch (cause) {
      addToast('error', 'Could not save scenario', cause instanceof Error ? cause.message : undefined);
    }
  }

  async function deleteScenario(id: string) {
    const response = await fetch(`/api/scenarios/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Could not delete scenario');
    setSaved((current) => current.filter((scenario) => scenario.id !== id));
    addToast('success', 'Scenario deleted');
  }

  if (loading) return <div className="space-y-6 animate-pulse"><div className="h-8 bg-slate-200 rounded w-64" /><div className="h-96 bg-slate-100 rounded-2xl" /></div>;
  if (error || !data || !projection) {
    return <div className="bg-red-50 border border-red-200 rounded-lg p-4"><h3 className="text-red-700 font-medium">Could not load scenario studio</h3><p className="text-red-600 text-sm mt-1">{error}</p></div>;
  }

  const summary = projection.summary;
  const chartData = projection.periods.map((p) => ({
    label: new Date(p.periodStart + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    Cash: p.closingCashCents / 100,
    Reserve: p.minimumReserveCents / 100,
    pressure: p.isPressured ? p.cashShortfallCents / 100 : 0,
  }));
  const money = (cents: number) => formatMoney(cents, currency);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Scenario Studio</h1>
        <p className="text-slate-500 mt-1">Drag the levers and watch your liquidity respond instantly</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-5">
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={() => { setRevenueDecline(PRESETS.base.revenueDecline); setExpenseIncrease(PRESETS.base.expenseIncrease); setNewLoan(0); }}>Base</button>
              <button className="btn-secondary" onClick={() => { setRevenueDecline(PRESETS.mild.revenueDecline); setExpenseIncrease(PRESETS.mild.expenseIncrease); }}>Mild</button>
              <button className="btn-secondary" onClick={() => { setRevenueDecline(PRESETS.severe.revenueDecline); setExpenseIncrease(PRESETS.severe.expenseIncrease); }}>Severe</button>
            </div>

            <label className="block">
              <span className="flex justify-between text-sm font-medium text-slate-700"><span>Revenue decline</span><span className="text-indigo-600 font-bold">{revenueDecline}%</span></span>
              <input type="range" min="0" max="60" value={revenueDecline} onChange={(e) => setRevenueDecline(Number(e.target.value))} className="w-full mt-2 accent-indigo-600" />
            </label>

            <label className="block">
              <span className="flex justify-between text-sm font-medium text-slate-700"><span>Expense increase</span><span className="text-indigo-600 font-bold">{expenseIncrease}%</span></span>
              <input type="range" min="0" max="40" value={expenseIncrease} onChange={(e) => setExpenseIncrease(Number(e.target.value))} className="w-full mt-2 accent-indigo-600" />
            </label>

            <div className="border-t border-slate-100 pt-4 space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Add a new loan (what-if)</p>
              <label className="block">
                <span className="flex justify-between text-sm text-slate-700"><span>Amount</span><span className="font-bold">{money(newLoan * 100)}</span></span>
                <input type="range" min="0" max="1000000" step="10000" value={newLoan} onChange={(e) => setNewLoan(Number(e.target.value))} className="w-full mt-2 accent-indigo-600" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="form-label">Rate %<input type="number" value={newLoanRate} min="0" max="40" step="0.5" onChange={(e) => setNewLoanRate(Number(e.target.value))} className="form-input mt-1" /></label>
                <label className="form-label">Term (months)<input type="number" value={newLoanTerm} min="1" max="120" onChange={(e) => setNewLoanTerm(Number(e.target.value))} className="form-input mt-1" /></label>
              </div>
            </div>

            {mayCreate && (
              <div className="border-t border-slate-100 pt-4">
                <div className="flex gap-2">
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Scenario name" className="form-input" />
                  <button className="btn-primary" onClick={saveScenario}>Save</button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Saved scenarios</h2>
            {saved.length === 0 ? (
              <p className="text-sm text-slate-500">No saved scenarios yet.</p>
            ) : (
              <div className="space-y-2">
                {saved.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{s.name}</p>
                      <p className="text-xs text-slate-500">{s.type.replace(/_/g, ' ')}</p>
                    </div>
                    {mayDelete && <DeleteButton label={`Delete ${s.name}`} confirmText={`Delete scenario "${s.name}"?`} onDelete={() => deleteScenario(s.id)} />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="metric-card"><p className="text-sm text-slate-500">Minimum cash</p><p className={`text-xl font-bold ${summary.minimumCashCents < 0 ? 'text-red-600' : 'text-slate-900'}`}>{money(summary.minimumCashCents)}</p></div>
            <div className="metric-card"><p className="text-sm text-slate-500">Pressure points</p><p className={`text-xl font-bold ${summary.totalPressuredPeriods > 0 ? 'text-red-600' : 'text-green-600'}`}>{summary.totalPressuredPeriods}</p></div>
            <div className="metric-card"><p className="text-sm text-slate-500">Largest shortfall</p><p className="text-xl font-bold text-red-600">{money(summary.largestShortfallCents)}</p></div>
            <div className="metric-card"><p className="text-sm text-slate-500">Coverage</p><p className="text-xl font-bold text-slate-900">{summary.debtServiceCoverageRatio == null ? 'n/a' : summary.debtServiceCoverageRatio.toFixed(2) + 'x'}</p></div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h2 className="text-lg font-semibold text-slate-900 mb-3">Projected cash under this scenario</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="studioFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#595ef2" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#595ef2" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef1f7" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} width={70} tickFormatter={(v) => `${currency} ${Math.round(Number(v) / 1000)}k`} />
                  <Tooltip formatter={(value: number | string) => money(Math.round(Number(value) * 100))} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine y={data.minimumReserveCents / 100} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Reserve floor', fontSize: 10, fill: '#ef4444', position: 'insideTopRight' }} />
                  <Area type="monotone" dataKey="Cash" stroke="#595ef2" strokeWidth={2} fill="url(#studioFill)" />
                  <Area type="monotone" dataKey="pressure" stroke="#ef4444" strokeWidth={1} fill="#ef444422" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {summary.firstShortageDate && (
              <p className="text-sm text-red-600 mt-3">First pressure expected around {new Date(summary.firstShortageDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Pressured periods</h2>
              {projection.periods.filter((p) => p.isPressured).length === 0 ? (
                <p className="text-sm text-slate-500">None — your reserve holds across the 12-month horizon.</p>
              ) : (
                <div className="space-y-2">
                  {projection.periods.filter((p) => p.isPressured).slice(0, 6).map((p) => (
                    <div key={p.periodStart} className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-sm">
                      <span className="text-slate-700">{new Date(p.periodStart + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – {new Date(p.periodEnd + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                      <span className="font-semibold text-red-600">-{money(p.cashShortfallCents)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Recommended actions</h2>
              <ul className="space-y-2 text-sm text-slate-600 list-disc pl-4">
                {summary.totalPressuredPeriods === 0 && <li>Cash stays above your reserve — you could accelerate repayment or consider up to {money(capacityMaxSafe)} of new monthly repayment.</li>}
                {summary.firstShortageDate && <li>Pressure begins {new Date(summary.firstShortageDate + 'T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} — build a buffer of at least {money(summary.largestShortfallCents)} before then.</li>}
                {revenueDecline > 0 && <li>A {revenueDecline}% revenue dip drives most of the shortfall — protect your highest-margin receipts.</li>}
                {expenseIncrease > 0 && <li>Costs are {expenseIncrease}% higher — renegotiate supplier terms or defer discretionary spend.</li>}
                {newLoan > 0 && <li>The {money(newLoan * 100)} facility adds monthly debt service — keep coverage above 1.25×.</li>}
                <li>Keep 60–90 days of fixed obligations in reserve as a safety cushion.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
