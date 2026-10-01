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
import type { BusinessObligation } from '@/domain/types';

export function ObligationsPage() {
  const { addToast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const mayCreate = canCreate(user?.role);
  const mayDelete = canDelete(user?.role);
  const currency = useOrganizationCurrency();
  const [obligations, setObligations] = useState<BusinessObligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BusinessObligation | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function submitObligation(event: React.FormEvent<HTMLFormElement>) {
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
      type: values.get('type'),
      amountCents,
      dueDate: values.get('dueDate'),
      recurrence: values.get('recurrence'),
      status: values.get('status') || 'PENDING',
    };
    try {
      if (editing) {
        const response = await fetch(`/api/obligations/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Could not update obligation');
        setObligations((current) => current.map((ob) => (ob.id === editing.id ? body.obligation : ob)).sort((a, b) => a.dueDate.localeCompare(b.dueDate)));
        addToast('success', 'Obligation updated');
      } else {
        const response = await fetch('/api/obligations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Could not add obligation');
        setObligations((current) => [...current, body.obligation].sort((a, b) => a.dueDate.localeCompare(b.dueDate)));
        addToast('success', 'Obligation added');
      }
      setShowForm(false);
      setEditing(null);
      form.reset();
      router.refresh();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'Could not save obligation');
    } finally {
      setSaving(false);
    }
  }

  async function deleteObligation(id: string) {
    const response = await fetch(`/api/obligations/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      addToast('error', 'Could not delete obligation');
      throw new Error('Could not delete obligation');
    }
    setObligations((current) => current.filter((obligation) => obligation.id !== id));
    addToast('success', 'Obligation deleted');
    router.refresh();
  }

  useEffect(() => {
    fetchJson<{ obligations: BusinessObligation[] }>('/api/obligations')
      .then((data) => setObligations(data.obligations || []))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load obligations'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="space-y-6 animate-pulse"><div className="h-8 bg-slate-200 rounded w-64" /><div className="h-72 bg-slate-100 rounded-2xl" /></div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-700 font-medium">Error loading obligations</h3>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }

  const totalPending = obligations.filter((o) => o.status === 'PENDING').reduce((s, o) => s + o.amountCents, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Business Obligations</h1>
          <p className="text-slate-500 mt-1">Track payroll, taxes, vendor payments, and other obligations</p>
        </div>
        {mayCreate && (
          <button type="button" onClick={() => { setShowForm((open) => !open); setEditing(null); }} className="btn-primary">
            {showForm && !editing ? 'Cancel' : '+ Add Obligation'}
          </button>
        )}
      </div>

      {showForm && (
        <form key={editing?.id ?? 'new'} onSubmit={submitObligation} className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-bold">{editing ? `Edit "${editing.name}"` : 'Add obligation'}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="form-label">Name<input name="name" required defaultValue={editing?.name ?? ''} className="form-input mt-1" placeholder="Vendor payment" /></label>
            <label className="form-label">Amount ({currency})<input name="amount" required type="number" min="0.01" step="0.01" defaultValue={editing ? editing.amountCents / 100 : ''} className="form-input mt-1" /></label>
            <label className="form-label">Type<select name="type" defaultValue={editing?.type ?? 'VENDOR'} className="form-select mt-1"><option value="VENDOR">Vendor</option><option value="PAYROLL">Payroll</option><option value="TAX">Tax</option><option value="RENT">Rent</option><option value="UTILITIES">Utilities</option><option value="INSURANCE">Insurance</option><option value="OTHER">Other</option></select></label>
            <label className="form-label">Due date<input name="dueDate" required type="date" defaultValue={editing?.dueDate ?? new Date().toISOString().slice(0, 10)} className="form-input mt-1" /></label>
            <label className="form-label">Recurrence<select name="recurrence" defaultValue={editing?.recurrence ?? 'ONE_TIME'} className="form-select mt-1"><option value="ONE_TIME">One time</option><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option><option value="QUARTERLY">Quarterly</option></select></label>
            <label className="form-label">Status<select name="status" defaultValue={editing?.status ?? 'PENDING'} className="form-select mt-1"><option value="PENDING">Pending</option><option value="PAID">Paid</option><option value="OVERDUE">Overdue</option><option value="CANCELLED">Cancelled</option></select></label>
          </div>
          {formError && <p role="alert" className="mt-3 text-sm text-red-700">{formError}</p>}
          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : editing ? 'Save changes' : 'Save obligation'}</button>
            {editing && <button type="button" className="btn-secondary" onClick={() => { setEditing(null); setShowForm(false); }}>Cancel</button>}
          </div>
        </form>
      )}

      {obligations.length === 0 ? (
        <EmptyState title="No obligations yet" description="Add payroll, taxes, rent, and other recurring obligations to track your commitments." />
      ) : (
        <>
          <div className="metric-card">
            <p className="text-sm text-slate-500">Total Pending Obligations</p>
            <p className="text-2xl font-bold text-slate-900">{formatMoney(totalPending, currency)}</p>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
            <table className="financial-table">
              <thead>
                <tr>
                  <th>Name</th><th>Type</th><th>Due Date</th><th>Recurrence</th><th className="text-right">Amount</th><th>Status</th>{(mayCreate || mayDelete) && <th className="text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {obligations.map((ob) => (
                  <tr key={ob.id}>
                    <td className="font-medium text-slate-900">{ob.name}</td>
                    <td><span className="badge-neutral">{ob.type}</span></td>
                    <td className="text-slate-600">{formatDate(ob.dueDate)}</td>
                    <td className="text-slate-600">{ob.recurrence.replace(/_/g, ' ')}</td>
                    <td className="text-right font-medium text-slate-900">{formatMoney(ob.amountCents, currency)}</td>
                    <td><span className={ob.status === 'PENDING' ? 'badge-warning' : ob.status === 'PAID' ? 'badge-safe' : 'badge-neutral'}>{ob.status}</span></td>
                    {(mayCreate || mayDelete) && (
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {mayCreate && (
                            <button type="button" className="row-delete" title={`Edit ${ob.name}`} aria-label={`Edit ${ob.name}`} onClick={() => { setEditing(ob); setShowForm(true); setFormError(null); }}>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
                            </button>
                          )}
                          {mayDelete && <DeleteButton label={`Delete ${ob.name}`} confirmText={`Delete obligation "${ob.name}"?`} onDelete={() => deleteObligation(ob.id)} />}
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
