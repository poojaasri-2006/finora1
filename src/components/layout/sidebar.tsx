'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';

const navigation = [
  { name: 'Dashboard', href: '/', icon: '📊' },
  { name: 'Financing', href: '/financing', icon: '🏦' },
  { name: 'Cash Flows', href: '/cash-flows', icon: '💰' },
  { name: 'Obligations', href: '/obligations', icon: '📋' },
  { name: 'Scenarios', href: '/scenarios', icon: '🔮' },
  { name: 'Alerts', href: '/alerts', icon: '🔔' },
  { name: 'Calendar', href: '/calendar', icon: '📅' },
  { name: 'Import/Export', href: '/import-export', icon: '📁' },
  { name: 'Settings', href: '/settings', icon: '⚙️' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <h1 className="text-xl font-bold text-white">CashShield</h1>
        <p className="text-xs text-slate-400 mt-1">Liquidity Command Center</p>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="p-4 border-t border-slate-700">
        <p className="text-xs text-slate-400">{user?.name || 'User'}</p>
        <p className="text-sm font-medium text-white truncate">{user?.email || ''}</p>
        <p className="text-xs text-slate-400 mt-1 capitalize">{user?.role?.replace('_', ' ') || ''}</p>
        <button
          onClick={logout}
          className="mt-2 text-xs text-slate-400 hover:text-white transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
