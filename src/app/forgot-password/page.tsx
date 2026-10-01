'use client';

import { useState } from 'react';
import Link from 'next/link';
import '@/components/auth/login-v2.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to process request');
        return;
      }
      setMessage(data.message);
      if (data.devResetUrl) setResetUrl(data.devResetUrl);
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-simple">
      <div className="auth-simple-card">
        <h1>Finora</h1>
        <h2>Reset your password</h2>

        {message && <div className="auth-msg ok">{message}</div>}
        {resetUrl && <p style={{ marginBottom: 16 }}><Link href={resetUrl} className="auth-link">Set a new password &rarr;</Link></p>}
        {error && <div className="auth-msg err">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@company.com"
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        <p className="auth-foot">
          Remember your password? <Link href="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
