'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatMoney } from '@/domain/money';
import { useAuth } from '@/components/auth/auth-provider';
import { useToast } from '@/components/ui/toast-provider';
import { fetchJson } from '@/lib/fetch';

type NovaStatus = {
  configured: boolean;
  connected: boolean;
  reason?: 'missing_key' | 'unauthorized' | 'unavailable';
};

export function SettingsPage() {
  const { logout } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [novaStatus, setNovaStatus] = useState<NovaStatus | null>(null);
  const [checkingNova, setCheckingNova] = useState(false);
  const [auditEvents, setAuditEvents] = useState<{ id: string; action: string; entityType: string; createdAt: string }[] | null>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);

  async function showAuditLog() {
    if (auditEvents) { setAuditEvents(null); return; }
    setLoadingAudit(true);
    try {
      const data = await fetchJson<{ events: { id: string; action: string; entityType: string; createdAt: string }[] }>('/api/audit');
      setAuditEvents(data.events);
    } catch (cause) {
      addToast('error', 'Could not load audit log', cause instanceof Error ? cause.message : undefined);
    } finally {
      setLoadingAudit(false);
    }
  }

  async function checkNova() {
    setCheckingNova(true);
    try {
      const status = await fetchJson<NovaStatus>('/api/integrations/nova', {
        retries: 0,
        timeout: 12000,
      });
      setNovaStatus(status);
    } catch {
      setNovaStatus({ configured: true, connected: false, reason: 'unavailable' });
    } finally {
      setCheckingNova(false);
    }
  }

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await fetchJson<{ organization: any }>('/api/settings');
        setOrg(data.organization);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings');
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name'),
      baseCurrency: formData.get('currency'),
      minimumCashReserveCents: Math.round(Number(formData.get('reserve')) * 100),
      currentCashCents: Math.round(Number(formData.get('currentCash')) * 100),
      defaultProjectionPeriod: formData.get('projectionPeriod'),
      fiscalYearStartMonth: Number(formData.get('fiscalYearStart')),
    };

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setMessage('Settings saved successfully');
        addToast('success', 'Settings saved');
        router.refresh();
      } else {
        setMessage('Failed to save settings');
        addToast('error', 'Failed to save settings');
      }
    } catch (error) {
      setMessage('Failed to save settings');
      addToast('error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-64" />
        <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-6">
          <div className="h-6 bg-slate-200 rounded w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 bg-slate-100 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-700 font-medium">Error loading settings</h3>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-700 font-medium">No organization found</h3>
        <p className="text-red-600 text-sm mt-1">Please contact support.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Configure your organization and preferences</p>
      </div>

      {message && (
        <div className="bg-green-50 text-green-700 p-3 rounded-md">{message}</div>
      )}

      <section className="bg-white rounded-lg border border-slate-200 p-6" aria-label="Aczen Nova API">
        <h2 className="text-lg font-semibold text-slate-900">Aczen Nova API</h2>
        <p className="text-sm text-slate-600 mt-2">
          Add your team key as <code>NOVA_API_KEY</code> in the server environment. The key is never sent to this page.
        </p>
        <div className="flex items-center gap-3 mt-4">
          <button type="button" onClick={checkNova} disabled={checkingNova} className="btn-secondary">
            {checkingNova ? 'Checking...' : 'Check connection'}
          </button>
          {novaStatus && (
            <span role="status" className={novaStatus.connected ? 'text-sm text-green-700' : 'text-sm text-amber-700'}>
              {novaStatus.connected
                ? 'Connected to Nova'
                : novaStatus.reason === 'missing_key'
                  ? 'NOVA_API_KEY is not configured on the server'
                  : novaStatus.reason === 'unauthorized'
                    ? 'Nova rejected the configured key'
                    : 'Nova is temporarily unavailable'}
            </span>
          )}
        </div>
      </section>

      <form onSubmit={handleSave} className="bg-white rounded-lg border border-slate-200 p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Organization Profile</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Organization Name</label>
              <input name="name" defaultValue={org.name} className="form-input" />
            </div>
            <div>
              <label className="form-label">Base Currency</label>
              <select name="currency" defaultValue={org.baseCurrency} className="form-select">
                {!['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'SGD', 'AED'].includes(org.baseCurrency) && (
                  <option value={org.baseCurrency}>{org.baseCurrency}</option>
                )}
                <option value="INR">INR — Indian Rupee</option>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
                <option value="CAD">CAD — Canadian Dollar</option>
                <option value="AUD">AUD — Australian Dollar</option>
                <option value="SGD">SGD — Singapore Dollar</option>
                <option value="AED">AED — UAE Dirham</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Financial Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Current Cash Balance ($)</label>
              <input
                name="currentCash"
                type="number"
                step="0.01"
                defaultValue={org.currentCashCents / 100}
                className="form-input"
              />
              <p className="text-xs text-slate-500 mt-1">
                Your current cash position
              </p>
            </div>
            <div>
              <label className="form-label">Minimum Cash Reserve ($)</label>
              <input
                name="reserve"
                type="number"
                step="0.01"
                defaultValue={org.minimumCashReserveCents / 100}
                className="form-input"
              />
              <p className="text-xs text-slate-500 mt-1">
                The minimum cash balance you want to maintain at all times
              </p>
            </div>
            <div>
              <label className="form-label">Default Projection Period</label>
              <select name="projectionPeriod" defaultValue={org.defaultProjectionPeriod} className="form-select">
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </div>
            <div>
              <label className="form-label">Fiscal Year Start Month</label>
              <select name="fiscalYearStart" defaultValue={org.fiscalYearStartMonth} className="form-select">
                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">User Roles & Permissions</h2>
          <p className="text-sm text-slate-500 mb-4">
            Manage user access and permissions for your organization.
          </p>
            <div className="bg-slate-50 rounded-md p-4 flex items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              Manage teammates and their roles on the Team page.
            </p>
            <Link href="/team" className="btn-secondary">Open Team</Link>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Audit Trail</h2>
          <p className="text-sm text-slate-500 mb-4">
            View a log of all important financial changes.
          </p>
          <button type="button" onClick={showAuditLog} disabled={loadingAudit} className="btn-secondary">{loadingAudit ? 'Loading...' : auditEvents ? 'Hide Audit Log' : 'View Audit Log'}</button>
          {auditEvents && <div className="mt-4 space-y-2">
            {auditEvents.length === 0 ? <p className="text-sm text-slate-500">No recorded changes yet.</p> :
              auditEvents.map((event) => <div key={event.id} className="flex flex-wrap justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"><span><strong>{event.action}</strong> · {event.entityType}</span><time className="text-slate-500">{new Date(event.createdAt).toLocaleString()}</time></div>)}
          </div>}
        </div>

        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          <button type="button" onClick={logout} className="btn-secondary">Sign out</button>
        </div>
      </form>
    </div>
  );
}
