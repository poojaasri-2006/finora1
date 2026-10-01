'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { formatMoney } from '@/domain/money';
import { formatDate, todayISO } from '@/domain/dates';
import { generateSchedule } from '@/domain/schedule';
import { DeleteButton } from '@/components/ui/delete-button';
import { useToast } from '@/components/ui/toast-provider';
import { useOrganizationCurrency } from '@/lib/use-organization-currency';
import { fetchJson } from '@/lib/fetch';
import type { BusinessObligation, FinancingAccount } from '@/domain/types';

interface CalEvent {
  id: string;
  date: string;
  kind: 'obligation' | 'installment';
  name: string;
  amountCents: number;
  meta: string;
  obligationId?: string;
  status?: string;
}

export function CalendarPage() {
  const { addToast } = useToast();
  const currency = useOrganizationCurrency();
  const [obligations, setObligations] = useState<BusinessObligation[]>([]);
  const [accounts, setAccounts] = useState<FinancingAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(todayISO().slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);

  function selectDay(dateStr: string) {
    setSelectedDate(dateStr);
    if (typeof window !== 'undefined' && window.innerWidth < 860) {
      requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }

  useEffect(() => {
    async function loadData() {
      try {
        const [obData, finData] = await Promise.all([
          fetchJson<{ obligations: BusinessObligation[] }>('/api/obligations'),
          fetchJson<{ accounts: FinancingAccount[] }>('/api/financing'),
        ]);
        setObligations(obData.obligations || []);
        setAccounts(finData.accounts || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load calendar data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const events = useMemo<CalEvent[]>(() => {
    const list: CalEvent[] = obligations.map((ob) => ({
      id: 'ob-' + ob.id,
      date: ob.dueDate,
      kind: 'obligation',
      name: ob.name,
      amountCents: ob.amountCents,
      meta: ob.type.replace(/_/g, ' ').toLowerCase(),
      obligationId: ob.id,
      status: ob.status,
    }));
    for (const account of accounts) {
      if (account.status !== 'ACTIVE') continue;
      try {
        const schedule = generateSchedule({
          principalCents: account.outstandingPrincipalCents,
          annualRate: account.annualInterestRate,
          startDate: account.startDate,
          maturityDate: account.maturityDate,
          frequency: account.paymentFrequency,
          repaymentMethod: account.repaymentMethod,
          feesCents: account.feesCents,
          gracePeriodMonths: account.gracePeriodMonths,
        });
        for (const inst of schedule) {
          list.push({
            id: 'in-' + account.id + '-' + inst.number,
            date: inst.dueDate,
            kind: 'installment',
            name: account.name,
            amountCents: inst.totalPaymentCents,
            meta: `installment ${inst.number} · interest ${formatMoney(inst.interestCents, currency)}`,
          });
        }
      } catch {
        /* skip account with invalid schedule */
      }
    }
    return list;
  }, [obligations, accounts, currency]);

  const byDate = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const ev of events) {
      const arr = map.get(ev.date) ?? [];
      arr.push(ev);
      map.set(ev.date, arr);
    }
    return map;
  }, [events]);

  const [year, month] = currentMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay();
  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthEvents = events.filter((ev) => ev.date.startsWith(currentMonth));
  const monthTotal = monthEvents.reduce((s, ev) => s + ev.amountCents, 0);
  const monthInstallments = monthEvents.filter((ev) => ev.kind === 'installment').reduce((s, ev) => s + ev.amountCents, 0);
  const selectedEvents = (byDate.get(selectedDate) ?? []).slice().sort((a, b) => a.kind.localeCompare(b.kind));

  function shiftMonth(delta: number) {
    const [, m] = currentMonth.split('-').map(Number);
    const next = new Date(year, m - 1 + delta, 1);
    setCurrentMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
  }

  async function addObligation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const amountCents = Math.round(Number(values.get('amount')) * 100);
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
      addToast('error', 'Enter a valid amount');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/obligations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.get('name'),
          type: values.get('type'),
          amountCents,
          dueDate: selectedDate,
          recurrence: values.get('recurrence'),
          status: 'PENDING',
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not add');
      setObligations((current) => [...current, body.obligation]);
      addToast('success', 'Obligation added', `${values.get('name')} on ${formatDate(selectedDate)}`);
      form.reset();
      setShowForm(false);
    } catch (cause) {
      addToast('error', 'Could not add obligation', cause instanceof Error ? cause.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  async function markPaid(id: string) {
    try {
      const response = await fetch(`/api/obligations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAID' }),
      });
      if (!response.ok) throw new Error('Could not update');
      setObligations((current) => current.map((ob) => (ob.id === id ? { ...ob, status: 'PAID' } : ob)));
      addToast('success', 'Marked as paid');
    } catch {
      addToast('error', 'Could not mark as paid');
    }
  }

  async function markUnpaid(id: string) {
    try {
      const response = await fetch(`/api/obligations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PENDING' }),
      });
      if (!response.ok) throw new Error('Could not update');
      setObligations((current) => current.map((ob) => (ob.id === id ? { ...ob, status: 'PENDING' } : ob)));
      addToast('success', 'Marked as unpaid');
    } catch {
      addToast('error', 'Could not update');
    }
  }

  async function deleteObligation(id: string) {
    const response = await fetch(`/api/obligations/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Could not delete');
    setObligations((current) => current.filter((ob) => ob.id !== id));
    addToast('success', 'Obligation deleted');
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-64" />
        <div className="h-[420px] bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-700 font-medium">Error loading calendar</h3>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Repayment Calendar</h1>
          <p className="text-slate-500 mt-1">Every obligation and loan installment, by date</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setCurrentMonth(todayISO().slice(0, 7)); setSelectedDate(todayISO()); }} className="btn-secondary">Today</button>
          <button onClick={() => shiftMonth(-1)} className="btn-secondary">Previous</button>
          <button onClick={() => shiftMonth(1)} className="btn-secondary">Next</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="metric-card"><p className="text-sm text-slate-500">Due this month</p><p className="text-2xl font-bold text-slate-900">{formatMoney(monthTotal, currency)}</p></div>
        <div className="metric-card"><p className="text-sm text-slate-500">Loan repayments</p><p className="text-2xl font-bold text-indigo-600">{formatMoney(monthInstallments, currency)}</p></div>
        <div className="metric-card"><p className="text-sm text-slate-500">Events</p><p className="text-2xl font-bold text-slate-900">{monthEvents.length}</p></div>
        <div className="metric-card"><p className="text-sm text-slate-500">Selected day</p><p className="text-2xl font-bold text-slate-900">{selectedEvents.length}</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">{monthName}</h2>
          <div className="cal-grid">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className="cal-head">{d}</div>)}
            {cells.map((day, i) => {
              if (day === null) return <div key={`e-${i}`} className="cal-cell empty" />;
              const dateStr = `${currentMonth}-${String(day).padStart(2, '0')}`;
              const dayEvents = byDate.get(dateStr) ?? [];
              return (
                <button
                  key={dateStr}
                  type="button"
                  className={`cal-cell ${dateStr === todayISO() ? 'today' : ''} ${dateStr === selectedDate ? 'selected' : ''}`}
                  onClick={() => selectDay(dateStr)}
                >
                  <span className="cal-num">{day}</span>
                  {dayEvents.slice(0, 2).map((ev) => (
                    <span key={ev.id} className={`cal-chip ${ev.kind}`}>{ev.name}</span>
                  ))}
                  {dayEvents.length > 2 && <span className="text-[10px] text-slate-400">+{dayEvents.length - 2} more</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div ref={detailRef} className="bg-white rounded-lg border border-slate-200 p-4" style={{ scrollMarginTop: 12 }}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-base font-semibold text-slate-900">{formatDate(selectedDate)}</h2>
            <button className="btn-secondary" onClick={() => setShowForm((v) => !v)}>{showForm ? 'Cancel' : '+ Add'}</button>
          </div>

          {showForm && (
            <form onSubmit={addObligation} className="mb-4 space-y-3 rounded-xl border border-violet-100 bg-slate-50 p-3">
              <input name="name" required placeholder="Obligation name" className="form-input" />
              <div className="grid grid-cols-2 gap-2">
                <input name="amount" required type="number" min="0.01" step="0.01" placeholder={`Amount (${currency})`} className="form-input" />
                <select name="type" className="form-select">
                  <option value="VENDOR">Vendor</option>
                  <option value="PAYROLL">Payroll</option>
                  <option value="TAX">Tax</option>
                  <option value="RENT">Rent</option>
                  <option value="UTILITIES">Utilities</option>
                  <option value="INSURANCE">Insurance</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <select name="recurrence" className="form-select">
                <option value="ONE_TIME">One time</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
              </select>
              <button type="submit" disabled={saving} className="btn-primary w-full">{saving ? 'Saving...' : `Add for ${formatDate(selectedDate)}`}</button>
            </form>
          )}

          {selectedEvents.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">Nothing scheduled on this day.</p>
          ) : (
            selectedEvents.map((ev) => (
              <div key={ev.id} className="cal-detail-item">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 text-sm truncate">{ev.name}</p>
                  <p className="text-xs text-slate-500 capitalize">
                    {ev.kind === 'installment' ? 'Loan repayment' : ev.meta} · {formatMoney(ev.amountCents, currency)}
                  </p>
                </div>
                {ev.kind === 'obligation' && ev.obligationId ? (
                  <div className="flex items-center gap-1 shrink-0">
                    {ev.status === 'PAID' ? (
                      <>
                        <span className="badge-safe">Paid</span>
                        <button className="btn-secondary" onClick={() => markUnpaid(ev.obligationId!)}>Undo</button>
                      </>
                    ) : (
                      <button className="btn-secondary" onClick={() => markPaid(ev.obligationId!)}>Mark paid</button>
                    )}
                    <DeleteButton label={`Delete ${ev.name}`} confirmText={`Delete obligation "${ev.name}"?`} onDelete={() => deleteObligation(ev.obligationId!)} />
                  </div>
                ) : (
                  <span className="badge-neutral shrink-0">Financing</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
