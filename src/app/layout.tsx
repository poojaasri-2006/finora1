import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/auth/auth-provider';
import { ToastProvider } from '@/components/ui/toast-provider';
import { AppShell } from '@/components/layout/app-shell';

export const metadata: Metadata = {
  title: 'CashShield — SME Liquidity Command Center',
  description: 'Know exactly when repayment commitments may put your business below its safe cash reserve.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50">
        <ToastProvider>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
