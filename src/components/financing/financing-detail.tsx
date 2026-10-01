'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import { generateSchedule } from '@/domain/schedule';
import { formatMoney } from '@/domain/money';
import { formatDate, todayISO } from '@/domain/dates';
import { useOrganizationCurrency } from '@/lib/use-organization-currency';
import { useAuth } from '@/components/auth/auth-provider';
import { canCreate } from '@/lib/roles';
import { fetchJson } from '@/lib/fetch';
import type { FinancingAccount } from '@/domain/types';

export function FinancingDetail({ id }: { id: string }) {
  const currency = useOrganizationCurrency();
  const { user } = useAuth();
  const mayEdit = canCreate(user?.role);
  const [account, setAccount] = useState<FinancingAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function saveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!account) return;
    const values = new FormData(event.currentTarget);
    setSaving(true);
    setFormError(null);
    try {
      const response = await fetch(`/api/financing/${account.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.get('name'),
          lender: values.get('lender'),
          annualInterestRate: Number(values.get('rate')) / 100,
          outstandingPrincipalCents: Math.round(Number(values.get('outstanding')) * 100),
          startDate: values.get('startDate'),
          maturityDate: values.get('maturityDate'),
          paymentFrequency: values.get('frequency'),
          repaymentMethod: values.get('method'),
          status: values.get('status'),
          notes: values.get('notes') || '',
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not update loan');
      setAccount(body.account);
      setEditing(false);
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'Could not update loan');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    fetchJson<{ account: FinancingAccount }>(`/api/financing/${id}`)
      .then((data) => setAccount(data.account))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load account'))
      .finally(() => setLoading(false));
  }, [id]);

  const schedule = useMemo(() => {
    if (!account) return [];
    try {
      return generateSchedule({
        principalCents: account.outstandingPrincipalCents,
        annualRate: account.annualInterestRate,
        startDate: account.startDate,
        maturityDate: account.maturityDate,
        frequency: account.paymentFrequency,
        repaymentMethod: account.repaymentMethod,
        feesCents: account.feesCents,
        gracePeriodMonths: account.gracePeriodMonths,
      });
    } catch {
      return [];
    }
  }, [account]);

  if (loading) return <div className="space-y-6 animate-pulse"><div className="h-8 bg-slate-200 rounded w-64" /><div className="h-72 bg-slate-100 rounded-2xl" /></div>;
  if (error || !account) {
    return <div className="bg-red-50 border border-red-200 rounded-lg p-4"><h3 className="text-red-700 font-medium">Could not load loan</h3><p className="text-red-600 text-sm mt-1">{error}</p><Link href="/financing" className="btn-secondary mt-4 inline-flex">Back to financing</Link></div>;
  }

  const today = todayISO();
  const totalPayments = schedule.reduce((s, i) => s + i.totalPaymentCents, 0);
  const totalInterest = schedule.reduce((s, i) => s + i.interestCents, 0);
  const next = schedule.find((i) => i.dueDate >= today);
  const paidCount = schedule.filter((i) => i.dueDate < today).length;
  const progress = schedule.length ? Math.round((paidCount / schedule.length) * 100) : 0;
  const chartData = schedule.map((i) => ({
    name: formatDate(i.dueDate),
    Principal: i.principalRepaymentCents / 100,
    Interest: i.interestCents / 100,
    Balance: i.closingPrincipalCents / 100,
  }));

  const methodLabels: Record<string, string> = { AMORTIZING: 'Amortizing', EQUAL_PRINCIPAL: 'Equal principal', INTEREST_ONLY: 'Interest only', BULLET: 'Bullet' };
  const comparison = (['AMORTIZING', 'EQUAL_PRINCIPAL', 'INTEREST_ONLY', 'BULLET'] as const).map((method) => {
    try {
      const s = generateSchedule({
        principalCents: account.outstandingPrincipalCents,
        annualRate: account.annualInterestRate,
        startDate: account.startDate,
        maturityDate: account.maturityDate,
        frequency: account.paymentFrequency,
        repaymentMethod: method,
        feesCents: account.feesCents,
        gracePeriodMonths: account.gracePeriodMonths,
      });
      return {
        method,
        first: s[0]?.totalPaymentCents ?? 0,
        interest: s.reduce((sum, x) => sum + x.interestCents, 0),
        total: s.reduce((sum, x) => sum + x.totalPaymentCents, 0),
      };
    } catch {
      return { method, first: 0, interest: 0, total: 0 };
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link href="/financing" className="text-sm text-indigo-600 font-medium">← Financing</Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">{account.name}</h1>
          <p className="text-slate-500 mt-1">{account.lender} · {account.type.replace(/_/g, ' ')} · {account.repaymentMethod.replace(/_/g, ' ')}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={account.status === 'ACTIVE' ? 'badge-safe' : 'badge-neutral'}>{account.status}</span>
          {mayEdit && <button type="button" className="btn-secondary" onClick={() => { setEditing((v) => !v); setFormError(null); }}>{editing ? 'Cancel' : 'Edit loan'}</button>}
        </div>
      </div>

      {editing && (
        <form onSubmit={saveEdit} className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-bold">Edit loan</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="form-label">Name<input name="name" required defaultValue={account.name} className="form-input mt-1" /></label>
            <label className="form-label">Lender<input name="lender" required defaultValue={account.lender} className="form-input mt-1" /></label>
            <label className="form-label">Status<select name="status" defaultValue={account.status} className="form-select mt-1"><option value="ACTIVE">Active</option><option value="PAID_OFF">Paid off</option><option value="DEFAULTED">Defaulted</option><option value="CANCELLED">Cancelled</option></select></label>
            <label className="form-label">Outstanding ({currency})<input name="outstanding" type="number" min="0.01" step="0.01" required defaultValue={account.outstandingPrincipalCents / 100} className="form-input mt-1" /></label>
            <label className="form-label">Annual rate (%)<input name="rate" type="number" min="0" max="100" step="0.01" required defaultValue={(account.annualInterestRate * 100).toFixed(2)} className="form-input mt-1" /></label>
            <label className="form-label">Payment frequency<select name="frequency" defaultValue={account.paymentFrequency} className="form-select mt-1"><option value="MONTHLY">Monthly</option><option value="WEEKLY">Weekly</option><option value="BIWEEKLY">Bi-weekly</option><option value="QUARTERLY">Quarterly</option><option value="ANNUAL">Annual</option></select></label>
            <label className="form-label">Start date<input name="startDate" type="date" required defaultValue={account.startDate} className="form-input mt-1" /></label>
            <label className="form-label">Maturity date<input name="maturityDate" type="date" required defaultValue={account.maturityDate} className="form-input mt-1" /></label>
            <label className="form-label">Repayment method<select name="method" defaultValue={account.repaymentMethod} className="form-select mt-1"><option value="AMORTIZING">Amortizing</option><option value="EQUAL_PRINCIPAL">Equal principal</option><option value="INTEREST_ONLY">Interest only</option><option value="BULLET">Bullet</option></select></label>
            <label className="form-label lg:col-span-3">Notes<input name="notes" defaultValue={account.notes} className="form-input mt-1" /></label>
          </div>
          {formError && <p role="alert" className="mt-3 text-sm text-red-700">{formError}</p>}
          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save changes'}</button>
            <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="metric-card"><p className="text-sm text-slate-500">Outstanding</p><p className="text-2xl font-bold text-slate-900">{formatMoney(account.outstandingPrincipalCents, currency)}</p></div>
        <div className="metric-card"><p className="text-sm text-slate-500">Interest rate</p><p className="text-2xl font-bold text-slate-900">{(account.annualInterestRate * 100).toFixed(2)}%</p></div>
        <div className="metric-card"><p className="text-sm text-slate-500">Total interest</p><p className="text-2xl font-bold text-red-600">{formatMoney(totalInterest, currency)}</p></div>
        <div className="metric-card"><p className="text-sm text-slate-500">Total to repay</p><p className="text-2xl font-bold text-slate-900">{formatMoney(totalPayments, currency)}</p></div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-slate-900">Repayment progress</h2>
          <span className="text-sm text-slate-500">{paidCount} of {schedule.length} installments · matures {formatDate(account.maturityDate)}</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-indigo-500" style={{ width: `${progress}%` }} /></div>
        {next && <p className="text-sm text-slate-600 mt-3">Next installment <strong>{formatMoney(next.totalPaymentCents, currency)}</strong> due {formatDate(next.dueDate)}</p>}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Principal vs interest over time</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f7" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} width={70} tickFormatter={(v) => `${currency} ${Math.round(Number(v) / 1000)}k`} />
              <Tooltip formatter={(value: number | string) => formatMoney(Math.round(Number(value) * 100), currency)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Principal" stackId="a" fill="#595ef2" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Interest" stackId="a" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              <Line type="monotone" dataKey="Balance" stroke="#0ea5e9" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Repayment schedule comparison</h2>
        <p className="text-sm text-slate-500 mb-4">Same principal, rate and term — how each repayment method compares.</p>
        <div className="overflow-x-auto">
          <table className="financial-table">
            <thead>
              <tr><th>Method</th><th className="text-right">First payment</th><th className="text-right">Total interest</th><th className="text-right">Total paid</th></tr>
            </thead>
            <tbody>
              {comparison.map((row) => (
                <tr key={row.method} className={row.method === account.repaymentMethod ? 'bg-indigo-50' : ''}>
                  <td className="font-medium text-slate-900">{methodLabels[row.method]}{row.method === account.repaymentMethod && <span className="ml-2 badge-safe">current</span>}</td>
                  <td className="text-right">{formatMoney(row.first, currency)}</td>
                  <td className="text-right text-amber-600">{formatMoney(row.interest, currency)}</td>
                  <td className="text-right font-medium">{formatMoney(row.total, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
        <h2 className="text-lg font-semibold text-slate-900 p-4 border-b border-slate-200">Amortization schedule</h2>
        <table className="financial-table">
          <thead>
            <tr>
              <th>#</th><th>Due date</th>
              <th className="text-right">Opening</th>
              <th className="text-right">Interest</th>
              <th className="text-right">Principal</th>
              <th className="text-right">Payment</th>
              <th className="text-right">Closing</th>
            </tr>
          </thead>
          <tbody>
            {schedule.map((i) => (
              <tr key={i.number} className={i.dueDate < today ? 'opacity-60' : ''}>
                <td>{i.number}</td>
                <td className="text-slate-600">{formatDate(i.dueDate)}</td>
                <td className="text-right">{formatMoney(i.openingPrincipalCents, currency)}</td>
                <td className="text-right text-amber-600">{formatMoney(i.interestCents, currency)}</td>
                <td className="text-right text-indigo-600">{formatMoney(i.principalRepaymentCents, currency)}</td>
                <td className="text-right font-medium">{formatMoney(i.totalPaymentCents, currency)}</td>
                <td className="text-right">{formatMoney(i.closingPrincipalCents, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
