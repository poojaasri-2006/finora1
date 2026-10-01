'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';
import { calculateSafeBorrowingCapacity } from '@/domain/capacity/safe-borrowing';
import './dashboard-v3.css';

const DAY = 24 * 60 * 60 * 1000;

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso, days) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function shortDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function DashboardV3({ initialData = null }) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState(null);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [quickAdd, setQuickAdd] = useState(false);

  function load() {
    setLoading(true);
    setError(null);
    fetch('/api/dashboard')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load dashboard');
        return res.json();
      })
      .then((result) => setData(result))
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { if (!initialData) load(); }, [initialData]);

  async function loadDemoData() {
    setLoadingDemo(true);
    try {
      const res = await fetch('/api/demo-data', { method: 'POST' });
      if (!res.ok) throw new Error('Could not load demo data');
      load();
    } catch {
      setError('Could not load demo data');
    } finally {
      setLoadingDemo(false);
    }
  }

  const model = useMemo(() => {
    if (!data) return null;
    const currency = data.currency || 'USD';
    const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 });
    const money = (cents) => fmt.format((cents || 0) / 100);

    const today = isoToday();
    const in30 = addDays(today, 30);
    const installments = [...(data.installments || [])].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const obligations = [...(data.obligations || [])].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const alerts = (data.alerts || []).filter((a) => !a.isDismissed);

    const upcomingInstallments = installments.filter((i) => i.dueDate >= today && i.dueDate <= in30);
    const upcomingObligations = obligations.filter((o) => o.status === 'PENDING' && o.dueDate >= today);
    const repayments30 = upcomingInstallments.reduce((s, i) => s + i.totalPaymentCents, 0);
    const obligations30 = upcomingObligations
      .filter((o) => o.dueDate <= in30)
      .reduce((s, o) => s + o.amountCents, 0);
    const next30 = repayments30 + obligations30;

    const payments = [
      ...upcomingObligations.map((o) => ({ id: 'o-' + o.id, name: o.name, dueDate: o.dueDate, amountCents: o.amountCents, kind: String(o.type).replace(/_/g, ' ').toLowerCase(), href: '/obligations' })),
      ...installments.filter((i) => i.dueDate >= today).map((i, idx) => ({ id: 'i-' + i.dueDate + '-' + idx, name: 'Loan repayment', dueDate: i.dueDate, amountCents: i.totalPaymentCents, kind: 'financing', href: '/financing' })),
    ].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    const minimumReserve = data.minimumReserveCents || 0;
    const reservePct = minimumReserve > 0 ? Math.min(100, Math.round(((data.openingCashCents || 0) / minimumReserve) * 100)) : 100;
    const dscr = data.projection?.summary?.debtServiceCoverageRatio;
    const dscrPct = dscr == null ? 0 : Math.min(100, Math.round(dscr * 100));
    const pressured = data.projection?.summary?.totalPressuredPeriods || 0;

    // current week strip
    const base = new Date(today + 'T00:00:00');
    const monday = new Date(base);
    monday.setDate(base.getDate() - ((base.getDay() + 6) % 7));
    const week = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return { label: d.toLocaleDateString('en-IN', { weekday: 'short' }), num: d.getDate(), iso: d.toISOString().slice(0, 10) };
    });

    const hasData = (data.openingCashCents || 0) !== 0 || obligations.length > 0 || installments.length > 0 ||
      (data.projection?.periods || []).some((p) => p.inflowsCents !== 0 || p.totalOutflowsCents !== 0);

    const periods = (data.projection?.periods || []).map((p) => ({
      label: shortDate(p.periodStart),
      cash: p.closingCashCents / 100,
      reserve: p.minimumReserveCents / 100,
    }));

    let capacity = null;
    try {
      capacity = calculateSafeBorrowingCapacity({
        projection: data.projection,
        scenario: { id: 'base', organizationId: data.organization?.id || '', name: 'Base Case', type: 'BASE', description: '', adjustments: [], createdAt: '', updatedAt: '' },
        minimumReserveCents: minimumReserve,
        projectionMonths: 12,
        stressLevel: 0,
        requiredCoverageRatio: 1.25,
        annualInterestRate: 0.08,
        loanTermMonths: 36,
      });
    } catch { capacity = null; }

    const financing = data.financingAccounts || [];
    const totalOutstanding = financing.reduce((s, a) => s + a.outstandingPrincipalCents, 0);
    const pendingObligations = obligations.filter((o) => o.status === 'PENDING');
    const totalPending = pendingObligations.reduce((s, o) => s + o.amountCents, 0);
    const in90 = addDays(today, 90);
    const next90 = pendingObligations.filter((o) => o.dueDate <= in90).reduce((s, o) => s + o.amountCents, 0)
      + installments.filter((i) => i.dueDate >= today && i.dueDate <= in90).reduce((s, i) => s + i.totalPaymentCents, 0);
    const catMap = {};
    for (const o of pendingObligations) { catMap[o.type] = (catMap[o.type] || 0) + o.amountCents; }
    const maxCat = Math.max(1, ...Object.values(catMap));
    const exposureCategories = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([type, amount]) => ({ type: String(type).replace(/_/g, ' ').toLowerCase(), amount, pct: Math.round((amount / maxCat) * 100) }));

    return { currency, money, alerts, installments, obligations, upcomingInstallments, upcomingObligations, repayments30, obligations30, next30, payments, minimumReserve, reservePct, dscr, dscrPct, pressured, week, hasData, periods, capacity, totalOutstanding, totalPending, next90, exposureCategories, openingCashCents: data.openingCashCents || 0, cashFloor: data.projection?.summary?.minimumCashCents || 0, orgName: data.organization?.name || 'there' };
  }, [data]);

  if (loading) {
    return <div className="d2-content-rows"><div className="d2-dash-loading">Loading your financial workspace...</div></div>;
  }

  if (error || !model) {
    return (
      <div className="d2-content-rows">
        <div className="d2-view-banner">
          <div className="d2-view-banner-text"><h2>Dashboard could not load</h2><p>{error || 'Unknown error'}</p></div>
          <button className="d2-banner-btn" onClick={load}>Retry</button>
        </div>
      </div>
    );
  }

  const m = model;

  return (
    <div className="d2-content-rows">
      <motion.section className="d2-row-top" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <div className="d2-greeting-col">
          <div className="d2-greeting-header">
            <h2 className="d2-greeting-name">Hi, {m.orgName}!</h2>
            <div className="d2-avatar-bubbles"><span className="d2-avatar-bubble purple">F</span><span className="d2-avatar-bubble cyan"><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.5l2.35 6.15L20.5 11l-6.15 2.35L12 19.5l-2.35-6.15L3.5 11l6.15-2.35z" /></svg></span></div>
          </div>
          <h1 className="d2-greeting-question">What is your<br />cash outlook today?</h1>
          <p className="d2-greeting-sub">Loans, obligations and projected cash in one clear view</p>
        </div>

        <div className="d2-feature-cards">
          <div className="d2-add-feature-card" title="Quick add" onClick={() => setQuickAdd((v) => !v)} role="button" tabIndex={0}>
            <div className="d2-add-square-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </div>
            {quickAdd && (
              <div className="d2-quick-add-menu" onClick={(e) => e.stopPropagation()}>
                <Link href="/cash-flows" onClick={() => setQuickAdd(false)}>Cash flow</Link>
                <Link href="/financing" onClick={() => setQuickAdd(false)}>Loan</Link>
                <Link href="/obligations" onClick={() => setQuickAdd(false)}>Obligation</Link>
                <Link href="/scenarios" onClick={() => setQuickAdd(false)}>Scenario</Link>
              </div>
            )}
          </div>

          <div className="d2-feature-card">
            <div className="d2-feature-illu">
              <svg width="40" height="40" viewBox="0 0 64 64" fill="none"><rect x="10" y="20" width="44" height="30" rx="5" stroke="#595df5" strokeWidth="2.5" fill="#eef0ff" /><path d="M10 30h44" stroke="#595df5" strokeWidth="2.5" /><circle cx="42" cy="40" r="4" fill="#595df5" /></svg>
            </div>
            <div>
              <h3 className="d2-feature-card-title">{m.money(m.openingCashCents)}</h3>
              <p className="d2-feature-card-desc">Cash available</p>
            </div>
          </div>

          <div className="d2-feature-card">
            <div className="d2-feature-illu">
              <svg width="40" height="40" viewBox="0 0 64 64" fill="none"><rect x="12" y="14" width="40" height="36" rx="5" stroke="#0ea5e9" strokeWidth="2.5" fill="#e6f6fe" /><path d="M12 26h40M22 10v8M42 10v8" stroke="#0ea5e9" strokeWidth="2.5" strokeLinecap="round" /></svg>
            </div>
            <div>
              <h3 className="d2-feature-card-title">{m.money(m.next30)}</h3>
              <p className="d2-feature-card-desc">Due in next 30 days</p>
            </div>
          </div>

          <div className="d2-feature-card">
            <div className="d2-feature-illu">
              <svg width="40" height="40" viewBox="0 0 64 64" fill="none"><path d="M12 46l12-14 9 8 19-22" stroke="#ef4444" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" /><circle cx="52" cy="18" r="4" fill="#ef4444" /></svg>
            </div>
            <div>
              <h3 className="d2-feature-card-title">{m.money(m.cashFloor)}</h3>
              <p className="d2-feature-card-desc">{m.pressured > 0 ? `${m.pressured} pressured period(s)` : 'Lowest projected cash'}</p>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section className="d2-row-mid" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.06 }}>
        <div className="d2-col-notifications">
          <div className="d2-card-header">
            <h3 className="d2-card-title">Alerts</h3>
            <Link href="/alerts" className="d2-card-header-btn"><span>View all</span></Link>
          </div>
          {m.alerts.length === 0 ? (
            <div className="d2-upcoming-card"><div className="d2-upcoming-top"><div className="d2-upcoming-title"><span>You&apos;re all caught up</span><span className="d2-green-status-dot" /></div></div><p className="d2-upcoming-desc">No active liquidity alerts right now.</p></div>
          ) : (
            m.alerts.slice(0, 3).map((alert) => (
              <Link key={alert.id} href="/alerts" className="d2-msg-notification" style={{ textDecoration: 'none' }}>
                <div className="d2-msg-title-row">
                  <span className="d2-msg-title">{alert.title}</span>
                  <span className={`d2-priority-badge ${alert.severity === 'CRITICAL' ? '' : 'mild'}`}>{alert.severity}</span>
                </div>
                <div className="d2-msg-sender">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /></svg>
                  <span>{alert.message}</span>
                </div>
                <div className="d2-msg-snippet">{String(alert.type).replace(/_/g, ' ').toLowerCase()}</div>
              </Link>
            ))
          )}
        </div>

        <div className="d2-col-assignments">
          <div className="d2-card-header">
            <h3 className="d2-card-title">Upcoming obligations</h3>
            <Link href="/obligations" className="d2-card-header-btn"><span>Manage</span></Link>
          </div>
          {m.upcomingObligations.length === 0 ? (
            <p className="d2-empty-note">No pending obligations.</p>
          ) : (
            m.upcomingObligations.slice(0, 3).map((o) => (
              <div key={o.id} className="d2-assignment-card">
                <div className="d2-assignment-top-row">
                  <h4 className="d2-assignment-title">{o.name}</h4>
                  <span className="d2-priority-badge mild">{m.money(o.amountCents)}</span>
                </div>
                <div className="d2-assignment-bottom-row">
                  <span className="d2-package-tag">{String(o.type).replace(/_/g, ' ')}</span>
                  <div className="d2-assignee-info"><span>Due {shortDate(o.dueDate)}</span><div className="d2-assignee-avatar" /></div>
                </div>
              </div>
            ))
          )}
          <Link href="/obligations" className="d2-add-assignment-btn" style={{ textDecoration: 'none' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            <span>Add obligation</span>
          </Link>
        </div>

        <div className="d2-col-schedule">
          <div className="d2-card-header">
            <h3 className="d2-card-title">{new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</h3>
            <Link href="/calendar" className="d2-card-header-btn"><span>Calendar</span></Link>
          </div>
          <div className="d2-calendar-strip">
            {m.week.map((d) => (
              <div key={d.iso} className="d2-day-col">
                <span className="d2-day-name">{d.label}</span>
                <span className={`d2-day-num ${d.iso === isoToday() ? 'active' : ''}`}>{d.num}</span>
              </div>
            ))}
          </div>
          <div className="d2-timeline-list">
            {m.payments.slice(0, 2).map((p) => (
              <div key={p.id} className="d2-timeline-slot">
                <div className="d2-time-label-row"><span>{shortDate(p.dueDate)}</span><span className="d2-time-dash" /></div>
                <Link href={p.href} className="d2-event-card" style={{ textDecoration: 'none' }}>
                  <div className="d2-event-left">
                    <div className="d2-event-icon-box purple">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                    </div>
                    <div className="d2-event-info">
                      <span className="d2-event-title">{p.name}</span>
                      <span className="d2-event-sub">{m.money(p.amountCents)} • {p.kind}</span>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
            {m.payments.length === 0 && <p className="d2-empty-note">No payments scheduled.</p>}
          </div>
        </div>
      </motion.section>

      <motion.section className="d2-row-bottom" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.12 }}>
        <div className="d2-col-today-tasks">
          <div className="d2-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 className="d2-card-title">Repayment schedule</h3>
              <div className="d2-stacked-avatars">
                <div className="d2-stacked-avatar" style={{ backgroundColor: '#f97316' }} />
                <div className="d2-stacked-avatar" style={{ backgroundColor: '#06b6d4' }} />
                <div className="d2-stacked-avatar" style={{ backgroundColor: '#6366f1', color: '#fff', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</div>
              </div>
            </div>
            <Link href="/financing" className="d2-card-header-btn"><span>Financing</span></Link>
          </div>

          {m.payments.slice(0, 4).map((p, i) => {
            const pct = Math.max(6, 100 - i * 22);
            return (
              <Link key={p.id} href={p.href} className="d2-task-row" style={{ textDecoration: 'none' }}>
                <div className="d2-task-name-col">
                  <span className="d2-task-name">{p.name}</span>
                  <span className="d2-task-date">Due {shortDate(p.dueDate)}</span>
                </div>
                <div className="d2-task-duration-col">
                  <span className="d2-task-duration-label">Amount</span>
                  <span>{m.money(p.amountCents)}</span>
                </div>
                <div className="d2-task-progress-col">
                  <span className="d2-task-pct">{pct}%</span>
                  <div className="d2-progress-bar-bg"><div className="d2-progress-bar-fill" style={{ width: `${pct}%` }} /></div>
                </div>
                <div className="d2-task-meta-col">
                  <span>{p.kind}</span>
                </div>
              </Link>
            );
          })}
          {m.payments.length === 0 && <p className="d2-empty-note">Nothing scheduled. Add loans or obligations to see repayments.</p>}
        </div>

        <div className="d2-premium-card">
          <div className="d2-premium-illu">
            <svg width="56" height="56" viewBox="0 0 64 64" fill="none"><path d="M32 8l6 14 14 1-10 10 3 14-13-7-13 7 3-14-10-10 14-1z" stroke="#ffffff" strokeWidth="2" fill="rgba(255,255,255,0.14)" /></svg>
          </div>
          <div>
            <h3 className="d2-premium-title">Stress-test your plan</h3>
            <p className="d2-premium-desc">See how slower revenue or a new loan affects your cash reserve across scenarios.</p>
          </div>
          <Link href="/scenarios" className="d2-premium-btn" style={{ textDecoration: 'none' }}>Run scenarios</Link>
        </div>

        <div className="d2-col-metrics-meeting">
          <div className="d2-gauges-card">
            <div className="d2-gauge-item">
              <div className="d2-donut-wrapper">
                <svg className="d2-donut-svg" viewBox="0 0 36 36">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e2e8f0" strokeWidth="3.5" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#06b6d4" strokeWidth="3.5" strokeDasharray={`${m.reservePct}, 100`} strokeLinecap="round" />
                </svg>
                <span className="d2-donut-pct">{m.reservePct}%</span>
              </div>
              <div className="d2-gauge-info">
                <span className="d2-gauge-category cyan">CASH SAFETY</span>
                <span className="d2-gauge-title">Reserve coverage</span>
                <span className="d2-gauge-sub">Floor {m.money(m.minimumReserve)}</span>
              </div>
            </div>

            <div className="d2-gauge-item">
              <div className="d2-donut-wrapper">
                <svg className="d2-donut-svg" viewBox="0 0 36 36">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e2e8f0" strokeWidth="3.5" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#ef4444" strokeWidth="3.5" strokeDasharray={`${m.dscrPct}, 100`} strokeLinecap="round" />
                </svg>
                <span className="d2-donut-pct">{m.dscr == null ? 'n/a' : m.dscr.toFixed(2)}x</span>
              </div>
              <div className="d2-gauge-info">
                <span className="d2-gauge-category red">DEBT SERVICE</span>
                <span className="d2-gauge-title">Coverage ratio</span>
                <span className="d2-gauge-sub">{m.dscr == null ? 'No inflows yet' : 'Inflows vs repayments'}</span>
                <Link href="/financing" className="d2-check-btn" style={{ textDecoration: 'none' }}>Check</Link>
              </div>
            </div>
          </div>

          <div className="d2-board-meeting-card">
            <div className="d2-meeting-title-row">
              <h4 className="d2-meeting-title">Next payment</h4>
              <Link href="/calendar" className="d2-card-header-btn"><span>Open</span></Link>
            </div>
            {m.payments[0] ? (
              <>
                <div className="d2-meeting-time"><span className="d2-meeting-dot" /><span>{shortDate(m.payments[0].dueDate)}</span></div>
                <p className="d2-meeting-desc">{m.payments[0].name} of {m.money(m.payments[0].amountCents)}</p>
              </>
            ) : (
              <p className="d2-meeting-desc">No upcoming repayments.</p>
            )}
            <div className="d2-meeting-btn-row">
              <Link href="/calendar" className="d2-reschedule-btn" style={{ textDecoration: 'none' }}>Calendar</Link>
              <Link href="/obligations" className="d2-accept-btn" style={{ textDecoration: 'none' }}>Obligations</Link>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section className="d2-row-chart" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.18 }}>
        <div className="d2-chart-card">
          <div className="d2-card-header">
            <div>
              <p className="d2-panel-kicker">LOOKING AHEAD</p>
              <h3 className="d2-card-title">Cash flow projection</h3>
            </div>
            <span className="d2-period-pill">{String(data.projection?.periodType || 'monthly').toLowerCase()}</span>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={m.periods} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="cashFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#595ef2" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#595ef2" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f7" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} width={64} tickFormatter={(v) => Math.round(Number(v) / 1000) + 'k'} />
                <Tooltip formatter={(v) => m.money(Math.round(Number(v) * 100))} />
                <ReferenceLine y={m.minimumReserve / 100} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Reserve floor', fontSize: 10, fill: '#ef4444', position: 'insideTopRight' }} />
                <Area type="monotone" dataKey="cash" stroke="#595ef2" strokeWidth={2} fill="url(#cashFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="d2-capacity-card">
          <p className="d2-panel-kicker">SAFE BORROWING</p>
          <h3 className="d2-capacity-value">{m.capacity ? m.money(m.capacity.maxSafeMonthlyRepaymentCents) : '-'}</h3>
          <p className="d2-capacity-sub">Maximum safe monthly repayment</p>
          <div className="d2-capacity-rows">
            <div><span>Affordable loan</span><strong>{m.capacity ? m.money(m.capacity.maxAffordableLoanAmountCents) : '-'}</strong></div>
            <div><span>Coverage ratio</span><strong>{m.capacity ? m.capacity.debtServiceCoverageRatio.toFixed(2) + 'x' : '-'}</strong></div>
            <div><span>Status</span><strong className={m.capacity?.isSafe ? 'ok' : 'warn'}>{m.capacity?.isSafe ? 'Within capacity' : 'Under pressure'}</strong></div>
          </div>
          <Link href="/scenarios" className="d2-premium-btn" style={{ textDecoration: 'none' }}>Test in scenarios</Link>
          <p className="d2-capacity-note">Estimate at 8% over 36 months, 125% coverage. Not financial advice.</p>
        </div>
      </motion.section>

      <motion.section className="d2-exposure" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.24 }}>
        <div className="d2-panel d2-exposure-panel">
          <div className="d2-card-header">
            <div>
              <p className="d2-panel-kicker">TOTAL EXPOSURE</p>
              <h3 className="d2-card-title">Financial exposure dashboard</h3>
            </div>
            <Link href="/obligations" className="d2-card-header-btn"><span>Obligations</span></Link>
          </div>
          <div className="d2-exposure-grid">
            <div><span>Outstanding debt</span><strong>{m.money(m.totalOutstanding)}</strong></div>
            <div><span>Pending obligations</span><strong>{m.money(m.totalPending)}</strong></div>
            <div><span>Repayments · 90 days</span><strong>{m.money(m.next90)}</strong></div>
            <div><span>Total exposure</span><strong className="d2-exposure-total">{m.money(m.totalOutstanding + m.totalPending)}</strong></div>
          </div>
          <div className="d2-exposure-cats">
            {m.exposureCategories.length === 0 && <p className="d2-empty-note">No pending obligations to break down.</p>}
            {m.exposureCategories.map((c) => (
              <div key={c.type} className="d2-exposure-cat">
                <div className="d2-exposure-cat-head"><span>{c.type}</span><strong>{m.money(c.amount)}</strong></div>
                <div className="d2-exposure-bar"><span style={{ width: c.pct + '%' }} /></div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {!m.hasData && (
        <section className="d2-onboard-card">
          <div>
            <h3>Start with your numbers</h3>
            <p>Add loans, revenue and obligations, or load sample data to explore the full workspace.</p>
          </div>
          <div className="d2-onboard-actions">
            <Link href="/financing" className="d2-banner-btn" style={{ textDecoration: 'none' }}>Add a loan</Link>
            <Link href="/cash-flows" className="d2-ghost-btn" style={{ textDecoration: 'none' }}>Add cash flow</Link>
            <button className="d2-ghost-btn" onClick={loadDemoData} disabled={loadingDemo}>{loadingDemo ? 'Loading...' : 'Load demo data'}</button>
          </div>
        </section>
      )}
    </div>
  );
}
