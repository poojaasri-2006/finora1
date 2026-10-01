'use client';

import { usePathname } from 'next/navigation';
import { V3Shell } from './v3-shell';

const publicPaths = new Set(['/login', '/signup', '/forgot-password', '/reset-password']);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (publicPaths.has(pathname)) {
    return <>{children}</>;
  }

  return <V3Shell>{children}</V3Shell>;
}
