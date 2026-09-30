'use client';

import { useEffect, useState } from 'react';
import { formatMoney } from '@/domain/money';
import { formatDate, todayISO, addMonths } from '@/domain/dates';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/components/auth/auth-provider';
import { fetchJson } from '@/lib/fetch';
import type { BusinessObligation, FinancingAccount } from '@/domain/types';

export function CalendarPage() {
  const { user } = useAuth();
  const [obligations, setObligations] = useState<BusinessObligation[]>([]);
  const [financingAccounts, setFinancingAccounts] = useState<FinancingAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(todayISO().slice(0, 7));

  useEffect(() => {
    async function loadData() {
      try {
        const [obData, finData] = await Promise.all([
          fetchJson<{ obligations: BusinessObligation[] }>('/api/obligations'),
          fetchJson<{ accounts: FinancingAccount[] }>('/api/financing'),
        ]);
        setObligations(obData.obligations || []);
        setFinancingAccounts(finData.accounts || []);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load calendar data');
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-64" />
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="h-6 bg-slate-200 rounded w-48 mb-4" />
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-20 bg-slate-100 rounded" />
            ))}
          </div>
        </div>
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

  // Group obligations by date
  const obligationsByDate: Record<string, BusinessObligation[]> = {};
  for (const ob of obligations) {
    if (!obligationsByDate[ob.dueDate]) obligationsByDate[ob.dueDate] = [];
    obligationsByDate[ob.dueDate].push(ob);
  }

  // Generate calendar days
  const [year, month] = currentMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();

  const days = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }

  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Repayment Calendar</h1>
          <p className="text-slate-500 mt-1">View all obligations and financing payments by date</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const [y, m] = currentMonth.split('-').map(Number);
              const prev = new Date(y, m - 2, 1);
              setCurrentMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
            }}
            className="btn-secondary"
          >
            ← Prev
          </button>
          <button
            onClick={() => {
              const [y, m] = currentMonth.split('-').map(Number);
              const next = new Date(y, m, 1);
              setCurrentMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
            }}
            className="btn-secondary"
          >
            Next →
          </button>
        </div>
      </div>

      {obligations.length === 0 && financingAccounts.length === 0 ? (
        <EmptyState
          title="No events to display"
          description="Add obligations and financing accounts to see them on the calendar."
          icon="📅"
        />
      ) : (
        <>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">{monthName}</h2>
            <div className="grid grid-cols-7 gap-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="text-center text-xs font-medium text-slate-500 py-2">{d}</div>
              ))}
              {days.map((day, i) => {
                if (day === null) return <div key={`empty-${i}`} />;
                const dateStr = `${currentMonth}-${String(day).padStart(2, '0')}`;
                const dayObligations = obligationsByDate[dateStr] || [];
                const hasItems = dayObligations.length > 0;
                return (
                  <div
                    key={dateStr}
                    className={`min-h-[80px] border rounded p-1 ${hasItems ? 'bg-blue-50 border-blue-200' : 'border-slate-100'}`}
                  >
                    <span className="text-xs font-medium text-slate-600">{day}</span>
                    {dayObligations.slice(0, 2).map((ob) => (
                      <div key={ob.id} className="text-xs bg-blue-100 text-blue-800 rounded px-1 py-0.5 mt-1 truncate">
                        {ob.name}
                      </div>
                    ))}
                    {dayObligations.length > 2 && (
                      <div className="text-xs text-slate-500 mt-1">+{dayObligations.length - 2} more</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Upcoming Events</h2>
            <div className="space-y-2">
              {obligations
                .filter((o) => o.status === 'PENDING')
                .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                .slice(0, 20)
                .map((ob) => (
                  <div key={ob.id} className="flex items-center justify-between py-2 border-b border-slate-100">
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{ob.name}</p>
                      <p className="text-xs text-slate-500">{ob.type} • {formatDate(ob.dueDate)}</p>
                    </div>
                    <span className="font-medium text-slate-900">{formatMoney(ob.amountCents, 'USD')}</span>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
