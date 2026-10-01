'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatMoney } from '@/domain/money';
import { formatDate } from '@/domain/dates';
import { EmptyState } from '@/components/ui/empty-state';
import { DeleteButton } from '@/components/ui/delete-button';
import { useAuth } from '@/components/auth/auth-provider';
import { canCreate, canDelete } from '@/lib/roles';
import { useOrganizationCurrency } from '@/lib/use-organization-currency';
import type { FinancingAccount } from '@/domain/types';

export function FinancingPage() {
  const { user } = useAuth();
  const mayCreate = canCreate(user?.role);
  const mayDelete = canDelete(user?.role);
  const currency = useOrganizationCurrency();
  const [accounts, setAccounts] = useState<FinancingAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetch('/api/financing')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load financing accounts');
        return res.json();
      })
      .then((data) => {
        setAccounts(data.accounts || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      });
  }, []);

  async function deleteAccount(id: string, name: string) {
    const response = await fetch(`/api/financing/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Could not delete financing account');
    setAccounts((current) => current.filter((account) => account.id !== id));
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-64" />
        <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
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
        <h3 className="text-red-700 font-medium">Error loading financing accounts</h3>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Financing Accounts</h1>
          <p className="text-slate-500 mt-1">Manage loans, credit facilities, and other financing</p>
        </div>
        {mayCreate && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            {showForm ? 'Cancel' : '+ Add Financing'}
          </button>
        )}
      </div>

      {showForm && <FinancingForm onComplete={() => { setShowForm(false); window.location.reload(); }} />}

      {accounts.length === 0 ? (
        <EmptyState
          title="No financing accounts yet"
          description="Add your first loan or credit facility to start tracking repayments."
          actions={[{ label: 'Add your first loan', href: '#add' }]}
        />
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
          <table className="financial-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Lender</th>
                <th>Type</th>
                <th>Method</th>
                <th className="text-right">Outstanding</th>
                <th className="text-right">Rate</th>
                <th>Maturity</th>
                <th>Status</th>
                {mayDelete && <th className="text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td className="font-medium text-slate-900"><Link href={`/financing/${account.id}`} className="text-indigo-600 hover:underline">{account.name}</Link></td>
                  <td className="text-slate-600">{account.lender}</td>
                  <td><span className="badge-neutral">{account.type.replace(/_/g, ' ')}</span></td>
                  <td className="text-slate-600">{account.repaymentMethod.replace(/_/g, ' ')}</td>
                  <td className="text-right font-medium">{formatMoney(account.outstandingPrincipalCents, currency)}</td>
                  <td className="text-right">{(account.annualInterestRate * 100).toFixed(2)}%</td>
                  <td className="text-slate-600">{formatDate(account.maturityDate)}</td>
                  <td>
                    <span className={account.status === 'ACTIVE' ? 'badge-safe' : 'badge-neutral'}>
                      {account.status}
                    </span>
                  </td>
                  {mayDelete && (
                    <td className="text-right">
                      <DeleteButton label={`Delete ${account.name}`} confirmText={`Delete financing account "${account.name}"? Its schedule and installments will be removed.`} onDelete={() => deleteAccount(account.id, account.name)} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FinancingForm({ onComplete }: { onComplete: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name'),
      lender: formData.get('lender'),
      type: formData.get('type'),
      originalPrincipalCents: Math.round(Number(formData.get('principal')) * 100),
      outstandingPrincipalCents: Math.round(Number(formData.get('principal')) * 100),
      annualInterestRate: Number(formData.get('rate')) / 100,
      interestType: 'FIXED',
      startDate: formData.get('startDate'),
      maturityDate: formData.get('maturityDate'),
      paymentFrequency: formData.get('frequency'),
      repaymentMethod: formData.get('method'),
      feesCents: 0,
      gracePeriodMonths: 0,
      status: 'ACTIVE',
      notes: formData.get('notes') || '',
    };

    try {
      const res = await fetch('/api/financing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create financing account');
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Add Financing Account</h2>
      {error && <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">{error}</div>}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Name</label>
          <input name="name" required className="form-input" placeholder="Equipment Term Loan" />
        </div>
        <div>
          <label className="form-label">Lender</label>
          <input name="lender" required className="form-input" placeholder="First National Bank" />
        </div>
        <div>
          <label className="form-label">Type</label>
          <select name="type" className="form-select">
            <option value="TERM_LOAN">Term Loan</option>
            <option value="REVOLVING_CREDIT">Revolving Credit</option>
            <option value="EQUIPMENT_FINANCING">Equipment Financing</option>
            <option value="LEASE">Lease</option>
            <option value="MERCHANT_CASH_ADVANCE">Merchant Cash Advance</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div>
          <label className="form-label">Principal Amount ($)</label>
          <input name="principal" type="number" step="0.01" required className="form-input" placeholder="200000" />
        </div>
        <div>
          <label className="form-label">Annual Interest Rate (%)</label>
          <input name="rate" type="number" step="0.01" required className="form-input" placeholder="7.5" />
        </div>
        <div>
          <label className="form-label">Start Date</label>
          <input name="startDate" type="date" required className="form-input" />
        </div>
        <div>
          <label className="form-label">Maturity Date</label>
          <input name="maturityDate" type="date" required className="form-input" />
        </div>
        <div>
          <label className="form-label">Payment Frequency</label>
          <select name="frequency" className="form-select">
            <option value="MONTHLY">Monthly</option>
            <option value="WEEKLY">Weekly</option>
            <option value="BIWEEKLY">Bi-weekly</option>
            <option value="QUARTERLY">Quarterly</option>
            <option value="ANNUAL">Annual</option>
          </select>
        </div>
        <div>
          <label className="form-label">Repayment Method</label>
          <select name="method" className="form-select">
            <option value="AMORTIZING">Amortizing (Equal Installment)</option>
            <option value="EQUAL_PRINCIPAL">Equal Principal</option>
            <option value="INTEREST_ONLY">Interest Only</option>
            <option value="BULLET">Bullet</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="form-label">Notes</label>
          <textarea name="notes" className="form-input" rows={2} placeholder="Optional notes..." />
        </div>
        <div className="md:col-span-2 flex gap-2">
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Creating...' : 'Create Financing Account'}
          </button>
          <button type="button" onClick={onComplete} className="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  );
}
