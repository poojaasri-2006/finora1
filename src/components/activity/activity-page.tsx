'use client';

import { useEffect, useState } from 'react';

interface AuditEvent {
  id: string;
  action: string;
  entityType: string;
  createdAt: string;
}

const ACTION_STYLES: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  GENERATE: 'bg-indigo-100 text-indigo-700',
  IMPORT: 'bg-amber-100 text-amber-700',
  EXPORT: 'bg-slate-100 text-slate-700',
};

export function ActivityPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    fetch('/api/audit')
      .then(async (res) => {
        if (res.status === 403) { setDenied(true); return; }
        if (!res.ok) throw new Error('Failed to load activity');
        const data = await res.json();
        setEvents(data.events || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load activity'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="space-y-6 animate-pulse"><div className="h-8 bg-slate-200 rounded w-64" /><div className="h-96 bg-slate-100 rounded-2xl" /></div>;

  if (denied) {
    return <div className="bg-amber-50 border border-amber-200 rounded-lg p-4"><h3 className="text-amber-800 font-medium">Restricted</h3><p className="text-amber-700 text-sm mt-1">The activity log is available to owners and admins only.</p></div>;
  }

  if (error) return <div className="bg-red-50 border border-red-200 rounded-lg p-4"><h3 className="text-red-700 font-medium">Error</h3><p className="text-red-600 text-sm mt-1">{error}</p></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Activity Log</h1>
        <p className="text-slate-500 mt-1">Every create, update, and delete across your workspace</p>
      </div>

      {events.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center text-slate-500">No activity recorded yet.</div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="space-y-1">
            {events.map((event) => (
              <div key={event.id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ACTION_STYLES[event.action] ?? 'bg-slate-100 text-slate-700'}`}>{event.action}</span>
                  <span className="text-sm text-slate-700">{event.entityType}</span>
                </div>
                <time className="text-xs text-slate-400 whitespace-nowrap">{new Date(event.createdAt).toLocaleString('en-IN')}</time>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
