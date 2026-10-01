'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatMoney } from '@/domain/money';
import { formatDate } from '@/domain/dates';
import { EmptyState } from '@/components/ui/empty-state';
import { DeleteButton } from '@/components/ui/delete-button';
import { useToast } from '@/components/ui/toast-provider';
import { useAuth } from '@/components/auth/auth-provider';
import { canCreate, canDelete } from '@/lib/roles';
import { useOrganizationCurrency } from '@/lib/use-organization-currency';
import { fetchJson } from '@/lib/fetch';
import type { CashFlowEntry } from '@/domain/types';

export function CashFlowsPage() {
  const { addToast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const mayCreate = canCreate(user?.role);
  const mayDelete = canDelete(user?.role);
  const currency = useOrganizationCurrency();
  const [entries, setEntries] = useState<CashFlowEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'INFLOW' | 'OUTFLOW'>('ALL');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CashFlowEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function submitEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const amountCents = Math.round(Number(values.get('amount')) * 100);
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
      setFormError('Enter a valid amount greater than zero.');
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = {
      name: values.get('name'),
      category: values.get('category'),
      type: values.get('type'),
      amountCents,
      recurrence: values.get('recurrence'),
      startDate: values.get('startDate'),
    };
    try {
      if (editing) {
        const response = await fetch(`/api/cash-flows/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Could not update cash flow');
        setEntries((current) => current.map((entry) => (entry.id === editing.id ? body.entry : entry)));
        addToast('success', 'Cash flow updated');
      } else {
        const response = await fetch('/api/cash-flows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Could not add cash flow');
        setEntries((current) => [body.entry, ...current]);
        addToast('success', 'Cash flow added');
      }
      setShowForm(false);
      setEditing(null);
      form.reset();
      router.refresh();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'Could not save cash flow');
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry(id: string) {
    const response = await fetch(`/api/cash-flows/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      addToast('error', 'Could not delete', body.error);
      throw new Error('Could not delete cash flow');
    }
    setEntries((current) => current.filter((entry) => entry.id !== id));
    addToast('success', 'Cash flow deleted');
    router.refresh();
  }

  useEffect(() => {
    fetchJson<{ entries: CashFlowEntry[] }>('/api/cash-flows')
      .then((data) => setEntries(data.entries || []))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load cash flows'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-slate-100 rounded-xl" />)}
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
        {mayCreate && (
          <button type="button" onClick={() => { setShowForm((open) => !open); setEditing(null); }} className="btn-primary">
            {showForm && !editing ? 'Cancel' : '+ Add Cash Flow'}
          </button>
        )}
      </div>

      {showForm && (
        <form key={editing?.id ?? 'new'} onSubmit={submitEntry} className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-bold">{editing ? `Edit "${editing.name}"` : 'Add cash flow'}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="form-label">Name<input name="name" required defaultValue={editing?.name ?? ''} className="form-input mt-1" placeholder="Customer receipts" /></label>
            <label className="form-label">Amount ({currency})<input name="amount" required type="number" min="0.01" step="0.01" defaultValue={editing ? editing.amountCents / 100 : ''} className="form-input mt-1" /></label>
            <label className="form-label">Type<select name="type" defaultValue={editing?.type ?? 'INFLOW'} className="form-select mt-1"><option value="INFLOW">Inflow</option><option value="OUTFLOW">Outflow</option></select></label>
            <label className="form-label">Category<select name="category" defaultValue={editing?.category ?? 'REVENUE'} className="form-select mt-1"><option value="REVENUE">Revenue</option><option value="CUSTOMER_RECEIPTS">Customer receipts</option><option value="PAYROLL">Payroll</option><option value="VENDOR_PAYMENTS">Vendor payments</option><option value="RENT">Rent</option><option value="UTILITIES">Utilities</option><option value="TAXES">Taxes</option><option value="OTHER_RECURRING">Other</option></select></label>
            <label className="form-label">Recurrence<select name="recurrence" defaultValue={editing?.recurrence ?? 'ONE_TIME'} className="form-select mt-1"><option value="ONE_TIME">One time</option><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option><option value="QUARTERLY">Quarterly</option></select></label>
            <label className="form-label">Start date<input name="startDate" required type="date" defaultValue={editing?.startDate ?? new Date().toISOString().slice(0, 10)} className="form-input mt-1" /></label>
          </div>
          {formError && <p role="alert" className="mt-3 text-sm text-red-700">{formError}</p>}
          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : editing ? 'Save changes' : 'Save cash flow'}</button>
            {editing && <button type="button" className="btn-secondary" onClick={() => { setEditing(null); setShowForm(false); }}>Cancel</button>}
          </div>
        </form>
      )}

      {entries.length === 0 ? (
        <EmptyState title="No cash flow entries yet" description="Add revenue, expenses, and other cash movements to track your cash position." />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="metric-card"><p className="text-sm text-slate-500">Total Inflows</p><p className="text-2xl font-bold text-green-600">{formatMoney(totalInflows, currency)}</p></div>
            <div className="metric-card"><p className="text-sm text-slate-500">Total Outflows</p><p className="text-2xl font-bold text-red-600">{formatMoney(totalOutflows, currency)}</p></div>
            <div className="metric-card"><p className="text-sm text-slate-500">Net Cash Flow</p><p className={`text-2xl font-bold ${totalInflows - totalOutflows >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatMoney(totalInflows - totalOutflows, currency)}</p></div>
          </div>

          <div className="flex gap-2">
            {(['ALL', 'INFLOW', 'OUTFLOW'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 rounded-md text-sm font-medium ${filter === f ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {f === 'ALL' ? 'All' : f === 'INFLOW' ? 'Inflows' : 'Outflows'}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
            <table className="financial-table">
              <thead>
                <tr>
                  <th>Name</th><th>Category</th><th>Type</th><th>Recurrence</th><th>Start Date</th><th className="text-right">Amount</th>{(mayCreate || mayDelete) && <th className="text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => (
                  <tr key={entry.id}>
                    <td data-label="Name" className="font-medium text-slate-900">{entry.name}</td>
                    <td data-label="Category"><span className="badge-neutral">{entry.category.replace(/_/g, ' ')}</span></td>
                    <td data-label="Type"><span className={entry.type === 'INFLOW' ? 'badge-safe' : 'badge-warning'}>{entry.type}</span></td>
                    <td data-label="Recurrence" className="text-slate-600">{entry.recurrence.replace(/_/g, ' ')}</td>
                    <td data-label="Start" className="text-slate-600">{formatDate(entry.startDate)}</td>
                    <td data-label="Amount" className={`text-right font-medium ${entry.type === 'INFLOW' ? 'text-green-600' : 'text-red-600'}`}>{entry.type === 'INFLOW' ? '+' : '-'}{formatMoney(entry.amountCents, currency)}</td>
                    {(mayCreate || mayDelete) && (
                      <td data-label="Actions" className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {mayCreate && (
                            <button type="button" className="row-delete" title={`Edit ${entry.name}`} aria-label={`Edit ${entry.name}`} onClick={() => { setEditing(entry); setShowForm(true); setFormError(null); }}>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
                            </button>
                          )}
                          {mayDelete && <DeleteButton label={`Delete ${entry.name}`} confirmText={`Delete cash flow "${entry.name}"?`} onDelete={() => deleteEntry(entry.id)} />}
                        </div>
                      </td>
                    )}
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
