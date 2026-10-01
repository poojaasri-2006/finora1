'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { buildNovaSnapshot, type NovaSnapshot } from '@/domain/nova/snapshot';

const demoSnapshot = buildNovaSnapshot({
  invoices: [
    { id: 'demo-invoice-1', status: 'overdue', due_date: '2026-09-25', balance_due: 175000 },
    { id: 'demo-invoice-2', status: 'open', due_date: '2026-10-08', balance_due: 230000 },
    { id: 'demo-invoice-3', status: 'open', due_date: '2026-10-22', balance_due: 118000 },
  ],
  purchaseBills: [
    { id: 'demo-bill-1', status: 'open', due_date: '2026-10-04', balance_due: 98000 },
    { id: 'demo-bill-2', status: 'open', due_date: '2026-10-17', balance_due: 125000 },
  ],
  loanSchedules: [
    { id: 'demo-loan-1', status: 'pending', due_date: '2026-10-10', total_due: 42000 },
    { id: 'demo-loan-2', status: 'pending', due_date: '2026-11-10', total_due: 42000 },
  ],
  payrollRuns: [
    { id: 'demo-payroll-1', pay_date: '2026-10-05', net: 65000 },
    { id: 'demo-payroll-2', pay_date: '2026-11-05', net: 65000 },
  ],
  statutoryDues: [
    { id: 'demo-tax-1', status: 'pending', due_date: '2026-10-20', amount: 18000 },
  ],
});

const formatINR = (paise: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
}).format(paise / 100);

export default function NovaPage() {
  const [snapshot, setSnapshot] = useState<NovaSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/integrations/nova/snapshot', { cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Nova data is unavailable');
        return body as NovaSnapshot;
      })
      .then((data) => { if (active) setSnapshot(data); })
      .catch((cause) => {
        if (!active) return;
        const message = cause instanceof Error ? cause.message : 'Nova data is unavailable';
        if (message.includes('NOVA_API_KEY is not configured')) {
          setSnapshot(demoSnapshot);
          setDemo(true);
        } else {
          setError(message);
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Nova planning snapshot</h1>
        <p className="text-slate-600 mt-1">Scheduled receivables and commitments from your team’s Aczen books.</p>
      </div>
      {loading && <p role="status" className="text-slate-600">Loading Nova data...</p>}
      {error && <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">{error}</div>}
      {demo && <div role="status" className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900">
        <strong>Sample Nova view.</strong> These are mock accounting records for the local preview, not your team&apos;s Aczen books. <Link href="/settings" className="font-semibold underline">Connect Nova in Settings</Link> to see your data.
      </div>}
      {snapshot && (
        <>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            Nova’s sample books are fixed as of {snapshot.asOfDate}. Past due balances are shown in week one.
            This is a scheduled net flow view, not a cash balance forecast: it excludes opening cash,
            unrecorded expenses, and payment timing changes. Planning estimate; not financial advice.
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Receivables" value={snapshot.totals.receivablesPaise} />
            <Metric label="Loan repayments" value={snapshot.totals.loansPaise} />
            <Metric label="Total scheduled net" value={snapshot.totals.netPaise} />
            <Metric label="Peak cumulative gap" value={snapshot.totals.peakGapPaise} />
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>{['Week', 'Receivables', 'Supplier bills', 'Loan repayments', 'Payroll', 'Taxes', 'Cumulative net'].map((heading) =>
                  <th key={heading} scope="col" className="whitespace-nowrap px-4 py-3 font-semibold">{heading}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {snapshot.weeks.map((week) => (
                  <tr key={week.startDate}>
                    <th scope="row" className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-900">{week.startDate} – {week.endDate}</th>
                    <td className="px-4 py-3">{formatINR(week.receivablesPaise)}</td>
                    <td className="px-4 py-3">{formatINR(week.billsPaise)}</td>
                    <td className="px-4 py-3">{formatINR(week.loansPaise)}</td>
                    <td className="px-4 py-3">{formatINR(week.payrollPaise)}</td>
                    <td className="px-4 py-3">{formatINR(week.taxesPaise)}</td>
                    <td className={`px-4 py-3 font-semibold ${week.cumulativeNetPaise < 0 ? 'text-red-700' : 'text-green-700'}`}>{formatINR(week.cumulativeNetPaise)}</td>
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

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-4">
    <p className="text-sm text-slate-600">{label}</p>
    <p className="mt-2 text-xl font-semibold text-slate-900">{formatINR(value)}</p>
  </div>;
}
