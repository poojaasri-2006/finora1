'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import '@/components/dashboard/dashboard-v3.css';

type IconName =
  | 'grid' | 'bank' | 'wallet' | 'file' | 'layers' | 'bell'
  | 'calendar' | 'download' | 'spark' | 'gear' | 'search' | 'logout' | 'plus'
  | 'sun' | 'moon' | 'command' | 'report' | 'activity' | 'team' | 'menu';

function Icon({ name, size = 19 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
    bank: <><path d="M3 10 12 4l9 6" /><path d="M5 10v9M19 10v9M9 10v9M15 10v9M3 19h18" /></>,
    wallet: <><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M3 9V6a2 2 0 0 1 2-2h12M16 13h5" /></>,
    file: <><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5M10 13h6M10 17h6" /></>,
    layers: <><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 11h18" /></>,
    download: <><path d="M12 3v11m-4-4 4 4 4-4" /><path d="M4 17v3h16v-3" /></>,
    spark: <><path d="M12 3v5M12 16v5M3 12h5M16 12h5" /><circle cx="12" cy="12" r="3.2" /></>,
    gear: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>,
    search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
    moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
    command: <><path d="M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3z" /></>,
    report: <><path d="M6 2h9l5 5v15H6z" /><path d="M15 2v5h5M9 13h6M9 17h6M9 9h2" /></>,
    activity: <path d="M3 12h4l3 8 4-16 3 8h4" />,
    team: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    menu: <><path d="M3 6h18M3 12h18M3 18h18" /></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const DOCK: { href: string; label: string; icon: IconName }[] = [
  { href: '/', label: 'Dashboard', icon: 'grid' },
  { href: '/financing', label: 'Financing', icon: 'bank' },
  { href: '/cash-flows', label: 'Cash flows', icon: 'wallet' },
  { href: '/obligations', label: 'Obligations', icon: 'file' },
  { href: '/scenarios', label: 'Scenarios', icon: 'layers' },
  { href: '/alerts', label: 'Alerts', icon: 'bell' },
  { href: '/calendar', label: 'Calendar', icon: 'calendar' },
  { href: '/nova', label: 'Nova data', icon: 'spark' },
];

const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: '/', label: 'Dashboard', icon: 'grid' },
  { href: '/cash-flows', label: 'Cash flows', icon: 'wallet' },
  { href: '/scenarios', label: 'Scenarios', icon: 'layers' },
  { href: '/report', label: 'Report', icon: 'report' },
  { href: '/team', label: 'Team', icon: 'team' },
];

export function V3Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [theme, setTheme] = useState('light');
  const [alertCount, setAlertCount] = useState(0);
  const [query, setQuery] = useState('');
  const [railHidden, setRailHidden] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [paletteIndex, setPaletteIndex] = useState(0);

  useEffect(() => {
    const stored = window.localStorage.getItem('d2-theme');
    if (stored === 'dark' || stored === 'light') setTheme(stored);
  }, []);

  useEffect(() => {
    window.localStorage.setItem('d2-theme', theme);
  }, [theme]);

  useEffect(() => {
    let active = true;
    fetch('/api/alerts')
      .then((res) => (res.ok ? res.json() : { alerts: [] }))
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data.alerts) ? data.alerts : [];
        setAlertCount(list.filter((a: { isDismissed?: boolean }) => !a.isDismissed).length);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [pathname]);

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  function exportData() {
    window.location.href = '/api/export?type=projection';
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
        setPaletteQuery('');
        setPaletteIndex(0);
      }
      if (event.key === 'Escape') setPaletteOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  interface Command { id: string; label: string; icon: IconName; run: () => void }
  const commands: Command[] = useMemo(() => {
    const nav: Command[] = DOCK.map((item) => ({ id: 'nav-' + item.href, label: 'Go to ' + item.label, icon: item.icon, run: () => router.push(item.href) }));
    const actions: Command[] = [
      { id: 'add-cf', label: 'Add cash flow', icon: 'wallet', run: () => router.push('/cash-flows') },
      { id: 'add-loan', label: 'Add a loan', icon: 'bank', run: () => router.push('/financing') },
      { id: 'studio', label: 'Open Scenario Studio', icon: 'layers', run: () => router.push('/scenarios') },
      { id: 'report', label: 'Open printable report', icon: 'report', run: () => router.push('/report') },
      { id: 'activity', label: 'Open activity log', icon: 'activity', run: () => router.push('/activity') },
      { id: 'team', label: 'Open team', icon: 'team', run: () => router.push('/team') },
      { id: 'export', label: 'Export projection CSV', icon: 'download', run: () => exportData() },
      { id: 'theme', label: 'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' mode', icon: theme === 'dark' ? 'sun' : 'moon', run: () => setTheme(theme === 'dark' ? 'light' : 'dark') },
      { id: 'signout', label: 'Sign out', icon: 'logout', run: () => { void signOut(); } },
    ];
    const all = [...nav, ...actions];
    const q = paletteQuery.trim().toLowerCase();
    return q ? all.filter((command) => command.label.toLowerCase().includes(q)) : all;
  }, [paletteQuery, theme]); // eslint-disable-line react-hooks/exhaustive-deps

  const allCommands: Command[] = useMemo(() => {
    const nav: Command[] = DOCK.map((item) => ({ id: 'nav-' + item.href, label: 'Go to ' + item.label, icon: item.icon, run: () => router.push(item.href) }));
    const tabs: Command[] = TABS.map((item) => ({ id: 'tab-' + item.href, label: 'Go to ' + item.label, icon: item.icon, run: () => router.push(item.href) }));
    const actions: Command[] = [
      { id: 'add-cf', label: 'Add cash flow', icon: 'wallet', run: () => router.push('/cash-flows') },
      { id: 'add-loan', label: 'Add a loan', icon: 'bank', run: () => router.push('/financing') },
      { id: 'add-ob', label: 'Add obligation', icon: 'file', run: () => router.push('/obligations') },
      { id: 'studio', label: 'Open Scenario Studio', icon: 'layers', run: () => router.push('/scenarios') },
      { id: 'import', label: 'Import / Export', icon: 'download', run: () => router.push('/import-export') },
      { id: 'activity', label: 'Open activity log', icon: 'activity', run: () => router.push('/activity') },
      { id: 'export', label: 'Export projection CSV', icon: 'download', run: () => exportData() },
      { id: 'theme', label: 'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' mode', icon: theme === 'dark' ? 'sun' : 'moon', run: () => setTheme(theme === 'dark' ? 'light' : 'dark') },
      { id: 'signout', label: 'Sign out', icon: 'logout', run: () => { void signOut(); } },
    ];
    const seen = new Set<string>();
    return [...nav, ...tabs, ...actions].filter((command) => (seen.has(command.label) ? false : (seen.add(command.label), true)));
  }, [theme]); // eslint-disable-line react-hooks/exhaustive-deps

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? allCommands.filter((command) => command.label.toLowerCase().includes(q)).slice(0, 6) : [];
  }, [query, allCommands]);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <div className={`d2-canvas ${theme === 'dark' ? 'd2-theme-dark' : ''} ${railHidden ? 'd2-rail-hidden' : ''}`}>
      <div className="d2-container">
        <aside className="d2-sidebar-wrapper" aria-label="Main navigation">
          <svg className="d2-sidebar-bg-svg" viewBox="0 0 80 800" preserveAspectRatio="none" aria-hidden="true">
            <path d="M 0,0 L 22,0 C 22,100 80,140 80,240 L 80,600 C 80,700 22,740 22,800 L 0,800 Z" fill="#595ef2" />
          </svg>
          <div className="d2-sidebar-nav">
            {DOCK.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`d2-dock-item ${isActive(item.href) ? 'active' : ''}`}
                title={item.label}
                aria-label={item.label}
                aria-current={isActive(item.href) ? 'page' : undefined}
              >
                <Icon name={item.icon} />
              </Link>
            ))}
          </div>
        </aside>

        <main className="d2-main-workspace">
          <header className="d2-header">
            <nav className="d2-nav-links" aria-label="Workspace">
              {TABS.map((tab) => (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`d2-nav-item ${isActive(tab.href) ? 'active' : ''}`}
                  aria-current={isActive(tab.href) ? 'page' : undefined}
                >
                  <Icon name={tab.icon} size={15} />
                  <span>{tab.label}</span>
                </Link>
              ))}
            </nav>

            <div className="d2-search-container">
              <svg className="d2-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
              <input
                type="text"
                className="d2-search-input"
                placeholder="Search modules and actions"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchResults[0]) {
                    searchResults[0].run();
                    setQuery('');
                  }
                  if (e.key === 'Escape') setQuery('');
                }}
              />
              {searchResults.length > 0 && (
                <div className="d2-search-results">
                  {searchResults.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="d2-search-result"
                      onClick={() => { c.run(); setQuery(''); }}
                    >
                      <Icon name={c.icon} size={14} />
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="d2-header-actions">
              <button
                type="button"
                className="d2-action-icon-btn d2-rail-toggle"
                onClick={() => setRailHidden((v) => !v)}
                title="Toggle navigation"
                aria-label="Toggle navigation"
              >
                <Icon name="menu" size={17} />
              </button>

              <button
                type="button"
                className="d2-action-icon-btn"
                onClick={() => { setPaletteOpen(true); setPaletteQuery(''); setPaletteIndex(0); }}
                title="Command menu (Ctrl+K)"
                aria-label="Command menu"
              >
                <Icon name="command" size={16} />
              </button>

              <div className="d2-theme-toggle">
                <button className={`d2-theme-btn ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')}><Icon name="sun" size={13} /><span>Light</span></button>
                <button className={`d2-theme-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')}><Icon name="moon" size={13} /><span>Dark</span></button>
              </div>

              <Link href="/alerts" className="d2-action-icon-btn" title="Notifications" aria-label="Notifications">
                <Icon name="bell" size={16} />
                {alertCount > 0 && <span className="d2-action-dot" />}
              </Link>

              <Link href="/settings" className="d2-action-icon-btn" title="Settings" aria-label="Settings">
                <Icon name="gear" size={16} />
              </Link>

              <button type="button" className="d2-export-btn" onClick={exportData} title="Export projection CSV">
                <Icon name="download" size={13} />
                <span>Export</span>
                <span className="d2-xls-tag">.csv</span>
              </button>

              <Link href="/cash-flows" className="d2-add-board-btn" style={{ textDecoration: 'none' }}>
                <Icon name="plus" size={13} />
                <span>Add cash flow</span>
              </Link>

              <button type="button" className="d2-signout-btn" onClick={signOut} title="Sign out" aria-label="Sign out">
                <Icon name="logout" size={16} />
              </button>
            </div>
          </header>

          <div className="d2-view-viewport d2-page-content">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {paletteOpen && (
        <div className="d2-cmd-overlay" onClick={() => setPaletteOpen(false)}>
          <div className="d2-cmd" onClick={(event) => event.stopPropagation()}>
            <input
              autoFocus
              className="d2-cmd-input"
              placeholder="Search modules and actions..."
              value={paletteQuery}
              onChange={(event) => { setPaletteQuery(event.target.value); setPaletteIndex(0); }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') { event.preventDefault(); setPaletteIndex((i) => Math.min(i + 1, commands.length - 1)); }
                if (event.key === 'ArrowUp') { event.preventDefault(); setPaletteIndex((i) => Math.max(i - 1, 0)); }
                if (event.key === 'Enter' && commands[paletteIndex]) { commands[paletteIndex].run(); setPaletteOpen(false); }
              }}
            />
            <div className="d2-cmd-list">
              {commands.map((command, index) => (
                <button
                  key={command.id}
                  type="button"
                  className={`d2-cmd-item ${index === paletteIndex ? 'active' : ''}`}
                  onMouseEnter={() => setPaletteIndex(index)}
                  onClick={() => { command.run(); setPaletteOpen(false); }}
                >
                  <Icon name={command.icon} size={16} />
                  <span>{command.label}</span>
                </button>
              ))}
              {commands.length === 0 && <p className="d2-cmd-empty">No matches</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
