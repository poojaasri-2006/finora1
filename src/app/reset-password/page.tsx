'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import '@/components/auth/login-v2.css';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) setError('Invalid or missing reset token');
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to reset password'); return; }
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return <div className="auth-msg err">Invalid or missing reset token. Please request a new password reset.</div>;
  }

  if (success) {
    return <div className="auth-msg ok">Password reset successfully. Redirecting to login...</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="auth-msg err">{error}</div>}
      <label htmlFor="password">New password</label>
      <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} placeholder="••••••••" />
      <label htmlFor="confirmPassword">Confirm new password</label>
      <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} placeholder="••••••••" />
      <button type="submit" disabled={loading}>{loading ? 'Resetting...' : 'Reset password'}</button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="auth-simple">
      <div className="auth-simple-card">
        <h1>Finora</h1>
        <h2>Set a new password</h2>
        <Suspense fallback={<div className="auth-msg">Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
        <p className="auth-foot">
          Remember your password? <Link href="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
