'use client';

import { Suspense, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { MailCheck } from 'lucide-react';
import ResendVerification from '@/components/common/ResendVerification';
import { AUTH_API_URL } from '@/lib/auth';

function VerifyEmail({ token }: { token: string }) {
  const [status, setStatus] = useState<'ready' | 'loading' | 'success' | 'invalid'>(token ? 'ready' : 'invalid');
  const [error, setError] = useState('');
  const pending = useRef(false);

  async function verify() {
    if (!token || pending.current || status === 'success' || status === 'invalid') return;
    pending.current = true;
    setStatus('loading');
    setError('');
    try {
      const response = await fetch(`${AUTH_API_URL}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (response.status === 200) {
        setStatus('success');
      } else if (response.status === 400) {
        setStatus('invalid');
      } else {
        setStatus('ready');
        setError('Unable to verify your email. Please try again.');
      }
    } catch {
      setStatus('ready');
      setError('Unable to connect to the server. Please try again.');
    } finally {
      pending.current = false;
    }
  }

  return (
    <>
      <MailCheck aria-hidden="true" className="mx-auto mb-4 h-12 w-12 text-purple-600" />
      <h1 className="text-2xl font-bold text-purple-700">{status === 'success' ? 'Email verified!' : 'Verify your email'}</h1>
      <div aria-live="polite" className="mt-4 text-gray-600">
        {status === 'success' ? 'Your account has been verified. You can now sign in.'
          : status === 'invalid' ? 'This link is invalid, has expired, or has already been used. Request a new verification email.'
          : 'Click the button below to verify the email address for your account.'}
      </div>
      {error && <p role="alert" className="mt-4 text-red-600">{error}</p>}
      {(status === 'ready' || status === 'loading') && (
        <button type="button" onClick={verify} disabled={status === 'loading'}
          className="mt-6 w-full rounded-lg bg-purple-600 px-4 py-3 font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50">
          {status === 'loading' ? 'Verifying...' : 'Verify email'}
        </button>
      )}
      {status === 'invalid' && <ResendVerification />}
      <Link href="/auth/login" className="mt-6 inline-block rounded-lg px-4 py-3 font-semibold text-purple-700 hover:bg-purple-50">Sign in</Link>
    </>
  );
}

function VerificationContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  return <VerifyEmail key={token} token={token} />;
}

export default function VerifyEmailPage() {
  return (
    <main lang="en" className="flex min-h-dvh items-center justify-center bg-cover bg-center bg-no-repeat px-4 py-6 sm:py-10" style={{ backgroundImage: "url('/mytripv3.jpg')" }}>
      <section className="w-full max-w-lg rounded-2xl bg-white p-5 text-center shadow-lg sm:p-10">
        <p className="mb-8 text-3xl font-bold text-purple-700">TripInOrder</p>
        <Suspense fallback={<p role="status" className="text-gray-600">Loading...</p>}>
          <VerificationContent />
        </Suspense>
      </section>
    </main>
  );
}
