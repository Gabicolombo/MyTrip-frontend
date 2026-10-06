'use client';

import { useEffect, useRef, useState } from 'react';
import { AUTH_API_URL } from '@/lib/auth';

export default function ResendVerification({ initialEmail = '', initialCooldown = 0 }: { initialEmail?: string; initialCooldown?: number }) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState(initialCooldown);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const deadline = useRef(0);
  const pending = useRef(false);

  useEffect(() => {
    if (!remaining) return;
    if (!deadline.current) deadline.current = Date.now() + remaining * 1000;
    const timer = window.setInterval(() => {
      setRemaining(Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [remaining]);

  async function resend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || remaining > 0 || Date.now() < deadline.current) return;
    pending.current = true;
    setLoading(true);
    setMessage('');
    setError('');
    deadline.current = Date.now() + 60_000;
    setRemaining(60);
    try {
      const response = await fetch(`${AUTH_API_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!response.ok) {
        setError('Unable to resend the verification email. Please wait and try again.');
        return;
      }
      setMessage('Request sent. Check your inbox and spam folder.');
    } catch {
      setError('Unable to connect to the server. Please wait and try again.');
    } finally {
      pending.current = false;
      setLoading(false);
    }
  }

  return (
    <form onSubmit={resend} className="mt-6 border-t border-gray-200 pt-6 text-left">
      <label className="block text-sm font-medium text-gray-700">
        Account email
        <input type="email" autoComplete="email" required value={email}
          onChange={(event) => setEmail(event.target.value)} disabled={loading}
          placeholder="user@example.com"
          className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400" />
      </label>
      <button type="submit" disabled={loading || remaining > 0}
        className="mt-3 w-full rounded-lg border border-purple-600 px-4 py-2 font-semibold text-purple-700 hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-50">
        {loading ? 'Sending...' : remaining > 0 ? `Resend verification email (${remaining}s)` : 'Resend verification email'}
      </button>
      {message && <p role="status" className="mt-3 text-sm text-green-700">{message}</p>}
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    </form>
  );
}
