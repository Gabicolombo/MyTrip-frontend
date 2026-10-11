'use client';

import { Suspense, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import { TRIP_API_URL } from '@/lib/trip';

type Status = 'ready' | 'loading' | 'success' | 'invalid' | 'signin' | 'blocked';

const subscribe = () => () => {};

function TripInvite({ token, autoAccept }: { token: string; autoAccept: boolean }) {
  const [status, setStatus] = useState<Status>(
    !/^[a-f0-9]{64}$/.test(token) ? 'invalid' : autoAccept ? 'loading' : 'ready',
  );
  const signedIn = useSyncExternalStore(subscribe, () => !!localStorage.getItem('token'), () => true);
  const [error, setError] = useState('');
  const [tripId, setTripId] = useState<number | null>(null);
  const pending = useRef(false);
  // accept=1 makes the page accept the invitation by itself once the user is back from signing in.
  const acceptPath = `/trip-invite?token=${token}&accept=1`;
  const loginHref = `/auth/login?next=${encodeURIComponent(acceptPath)}`;
  const view: Status = (status === 'ready' || status === 'loading') && !signedIn ? 'signin' : status;

  async function accept() {
    const accessToken = localStorage.getItem('token');
    if (pending.current || !accessToken) return;
    pending.current = true;
    setStatus('loading');
    setError('');
    try {
      const response = await fetch(`${TRIP_API_URL}/trips/invites/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ token }),
      });
      const data = await response.json().catch(() => null);
      const message = typeof data?.message === 'string' ? data.message : '';
      if (response.status === 200) {
        setTripId(typeof data?.tripId === 'number' ? data.tripId : null);
        setStatus('success');
      } else if (response.status === 400 || response.status === 404 || message.includes('expired')) {
        setStatus('invalid');
      } else if (response.status === 409) {
        setStatus('blocked');
        setError(message.includes('already a participant')
          ? 'You are already a participant in this trip.'
          : 'This invitation has already been used.');
      } else if (response.status === 401) {
        if (message.includes('does not match')) {
          setStatus('blocked');
          setError('This invitation was sent to a different email address. Sign in with the account that received it.');
        } else if (message.includes('verified account')) {
          setStatus('blocked');
          setError('Verify your email address before accepting this invitation.');
        } else {
          setStatus('signin');
        }
      } else {
        setStatus('ready');
        setError('Unable to accept the invitation. Please try again.');
      }
    } catch {
      setStatus('ready');
      setError('Unable to connect to the server. Please try again.');
    } finally {
      pending.current = false;
    }
  }

  useEffect(() => {
    if (status === 'loading') void accept();
    // Runs once: only the automatic accept after signing in starts in 'loading'.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <UserPlus aria-hidden="true" className="mx-auto mb-4 h-12 w-12 text-purple-600" />
      <h1 className="text-2xl font-bold text-purple-700">{view === 'success' ? 'Invitation accepted!' : 'Trip invitation'}</h1>
      <div aria-live="polite" className="mt-4 text-gray-600">
        {view === 'success' ? 'You are now a participant in this trip.'
          : view === 'invalid' ? 'This invitation is invalid or has expired. Ask the trip owner to send a new one.'
          : view === 'signin' ? 'Sign in with the email address that received this invitation to accept it.'
          : view === 'blocked' ? ''
          : 'Click the button below to join this trip.'}
      </div>
      {error && <p role="alert" className="mt-4 text-red-600">{error}</p>}
      {(view === 'ready' || view === 'loading') && (
        <button type="button" onClick={accept} disabled={view === 'loading'}
          className="mt-6 w-full rounded-lg bg-purple-600 px-4 py-3 font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50">
          {view === 'loading' ? 'Accepting...' : 'Accept invitation'}
        </button>
      )}
      {view === 'success' && (
        <Link href={tripId === null ? '/home' : `/trip/${tripId}`} className="mt-6 block w-full rounded-lg bg-purple-600 px-4 py-3 font-semibold text-white hover:bg-purple-700">
          {tripId === null ? 'Go to my trips' : 'Open trip'}
        </Link>
      )}
      {(view === 'signin' || view === 'blocked') && (
        <Link href={loginHref} className="mt-6 block w-full rounded-lg bg-purple-600 px-4 py-3 font-semibold text-white hover:bg-purple-700">
          {view === 'signin' ? 'Sign in' : 'Sign in with another account'}
        </Link>
      )}
      {view === 'signin' && (
        <Link href="/auth/register" onClick={() => localStorage.setItem('pendingInvite', acceptPath)} className="mt-2 inline-block rounded-lg px-4 py-3 font-semibold text-purple-700 hover:bg-purple-50">Create an account</Link>
      )}
      {view !== 'success' && view !== 'signin' && (
        <Link href="/home" className="mt-6 inline-block rounded-lg px-4 py-3 font-semibold text-purple-700 hover:bg-purple-50">Go to my trips</Link>
      )}
    </>
  );
}

function InviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  return <TripInvite key={token} token={token} autoAccept={searchParams.get('accept') === '1'} />;
}

export default function TripInvitePage() {
  return (
    <main lang="en" className="flex min-h-dvh items-center justify-center bg-cover bg-center bg-no-repeat px-4 py-6 sm:py-10" style={{ backgroundImage: "url('/mytripv3.jpg')" }}>
      <section className="w-full max-w-lg rounded-2xl bg-white p-5 text-center shadow-lg sm:p-10">
        <p className="mb-8 text-3xl font-bold text-purple-700">TripInOrder</p>
        <Suspense fallback={<p role="status" className="text-gray-600">Loading...</p>}>
          <InviteContent />
        </Suspense>
      </section>
    </main>
  );
}
