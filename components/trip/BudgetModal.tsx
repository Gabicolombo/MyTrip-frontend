'use client';

import { useEffect, useRef, useState } from 'react';
import { Wallet, X } from 'lucide-react';
import { TRIP_API_URL } from '@/lib/trip';
import { formatBudgetAmount, summarizeDestination, type ItineraryExpense, type BudgetSummary } from '@/lib/budget';

interface Destination { id: string; city: string; country: string }

function BudgetResults({ tripId, destinationId }: { tripId: number; destinationId: string }) {
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Please sign in again to view expenses.');
        const path = destinationId
          ? `/trips/itinerary/${encodeURIComponent(destinationId)}`
          : `/trips/itinerary-by-trip/${tripId}`;
        const response = await fetch(`${TRIP_API_URL}${path}`, {
          headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: controller.signal,
        });
        if (!response.ok) throw new Error(response.status === 401
          ? 'Please sign in again to view expenses.' : 'Unable to load expenses. Please try again.');
        
        let result: BudgetSummary;
        if (destinationId) {
          const items: ItineraryExpense[] = await response.json();
          result = summarizeDestination(items);
        } else {
          const data: BudgetSummary = await response.json();
          result = data;
        }
        
        
        if (!controller.signal.aborted) setSummary(result);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Unable to load expenses.');
      }
    }
    void load();
    return () => controller.abort();
  }, [tripId, destinationId, attempt]);

  if (error) return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5">
      <p role="alert" className="text-sm text-red-700">{error}</p>
      <button type="button" onClick={() => { setError(''); setAttempt(value => value + 1); }} className="mt-3 cursor-pointer rounded-lg bg-white px-4 py-2 text-sm font-semibold text-purple-700">Try again</button>
    </div>
  );
  if (!summary) return <p role="status" className="py-12 text-center text-gray-500">Loading expenses...</p>;
  if (!summary.totals.length) return (
    <div className="rounded-2xl border border-dashed border-purple-200 bg-purple-50/50 px-5 py-12 text-center">
      <Wallet aria-hidden="true" className="mx-auto mb-3 text-purple-400" size={32} />
      <h3 className="font-semibold text-gray-800">No recorded expenses yet</h3>
      <p className="mt-2 text-sm text-gray-500">Add an amount and currency to an itinerary item to see it here.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <section aria-label="Totals by currency" className="grid gap-3 sm:grid-cols-2">
        {summary.totals.map(total => (
          <div key={total.currency} className="min-w-0 rounded-2xl border border-purple-100 bg-purple-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">Total · {total.currency}</p>
            <p className="mt-2 break-words text-3xl font-bold tabular-nums text-purple-900">{formatBudgetAmount(total.amount)}</p>
          </div>
        ))}
      </section>
      <section aria-labelledby="budget-categories-heading">
        <h3 id="budget-categories-heading" className="mb-3 font-semibold text-gray-900">By category</h3>
        <div className="space-y-4">
          {summary.totals.map(total => (
            <div key={total.currency} className="overflow-hidden rounded-xl border border-gray-200">
              <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500">{total.currency}</div>
              <dl className="divide-y divide-gray-100">
                {summary.byCategory.filter(row => row.currency === total.currency).map(row => (
                  <div key={row.activity} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                    <dt className="text-gray-600">{row.activity}</dt>
                    <dd className="font-semibold tabular-nums text-gray-900">{row.currency} {formatBudgetAmount(row.amount)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function BudgetModal({ tripId, tripTitle, destinations, onClose }: {
  tripId: number; tripTitle: string; destinations: Destination[]; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [destinationId, setDestinationId] = useState('');
  const selectedDestination = destinations.find(destination => destination.id === destinationId);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { element?.close(); document.body.style.overflow = previousOverflow; };
  }, []);

  return (
    <dialog ref={dialog} aria-labelledby="budget-title" aria-describedby="budget-description"
      onCancel={event => { event.preventDefault(); onClose(); }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto overscroll-contain rounded-2xl bg-white p-0 text-gray-900 shadow-2xl backdrop:bg-black/50">
      <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-100 bg-white px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 id="budget-title" className="flex items-center gap-2 text-xl font-bold"><Wallet aria-hidden="true" size={22} className="text-purple-600" /> Budget</h2>
          <p className="mt-1 break-words text-sm text-gray-500">{tripTitle}</p>
        </div>
        <button type="button" autoFocus onClick={onClose} aria-label="Close budget" className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100"><X size={20} /></button>
      </header>
      <div className="space-y-5 p-5 sm:p-6">
        <p id="budget-description" className="text-sm text-gray-500">Recorded expenses only. Totals are kept separate by currency; no conversion is applied.</p>
        <div role="group" aria-label="Expense destination" className="flex gap-2 overflow-x-auto pb-2">
          {[{ id: '', city: 'All destinations', country: '' }, ...destinations].map(destination => (
            <button type="button" key={destination.id} aria-pressed={destinationId === destination.id}
              title={destination.country ? `${destination.city}, ${destination.country}` : 'Entire trip'}
              onClick={() => setDestinationId(destination.id)}
              className={`min-h-11 shrink-0 cursor-pointer rounded-xl border px-4 py-2 text-sm font-medium ${destinationId === destination.id ? 'border-purple-600 bg-purple-600 text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-purple-50'}`}>
              {destination.city}
            </button>
          ))}
        </div>
        <h3 className="text-sm font-semibold text-gray-700">{selectedDestination ? `${selectedDestination.city}, ${selectedDestination.country}` : 'Entire trip'} · Recorded expenses</h3>
        <BudgetResults key={`${tripId}-${destinationId}`} tripId={tripId} destinationId={destinationId} />
      </div>
    </dialog>
  );
}
