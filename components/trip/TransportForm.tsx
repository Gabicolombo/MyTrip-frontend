'use client';

import { useRef, useState } from 'react';
import { TRIP_API_URL } from '@/lib/trip';
import { currencies, itineraryCost } from '@/lib/itinerary-cost';
import { TRANSPORT_MODES, type Transport, type TransportMode } from '@/lib/transport';
import TimeSelect from './TimeSelect';
import {
  Combobox, ComboboxTrigger, ComboboxValue, ComboboxInput,
  ComboboxContent, ComboboxList, ComboboxItem, ComboboxEmpty,
} from '@/components/ui/combobox';

// The API stores 24h "HH:mm"; the picker works in 12h parts.
function timeParts(time: string) {
  const [h, m] = time.split(':').map(Number);
  return { hour: String(h % 12 === 0 ? 12 : h % 12), minute: String(m).padStart(2, '0'), ampm: h >= 12 ? 'PM' : 'AM' };
}

function time24(hour: string, minute: string, ampm: string) {
  const h = (Number(hour) % 12) + (ampm === 'PM' ? 12 : 0);
  return `${String(h).padStart(2, '0')}:${minute.padStart(2, '0')}`;
}

function TransportTime({ label, value, onChange }: { label: string; value: string; onChange: (time: string) => void }) {
  const { hour, minute, ampm } = timeParts(value);
  return (
    <TimeSelect label={label} hour={hour} minute={minute} ampm={ampm}
      onHourChange={next => onChange(time24(next, minute, ampm))}
      onMinuteChange={next => onChange(time24(hour, next, ampm))}
      onAmpmChange={next => onChange(time24(hour, minute, next))} />
  );
}

interface Stop { id: string; city: string; startDate: string; endDate: string }

interface TransportFormProps {
  tripId: number;
  from: Stop;
  to: Stop;
  transport?: Transport; // Only when editing
  onClose: () => void;
  onSuccess: () => void;
}

const fieldClass = 'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400';
const labelClass = 'text-xs font-semibold text-gray-500 uppercase tracking-wide';

export default function TransportForm({ tripId, from, to, transport, onClose, onSuccess }: TransportFormProps) {
  const isEditing = transport !== undefined;
  const [mode, setMode] = useState<TransportMode>(transport?.mode ?? 'FLIGHT');
  const [departureDate, setDepartureDate] = useState(transport?.departureDate.slice(0, 10) ?? from.endDate.slice(0, 10));
  const [departureTime, setDepartureTime] = useState(transport?.departureTime.slice(0, 5) ?? '12:00');
  const [arrivalDate, setArrivalDate] = useState(transport?.arrivalDate.slice(0, 10) ?? to.startDate.slice(0, 10));
  const [arrivalTime, setArrivalTime] = useState(transport?.arrivalTime.slice(0, 5) ?? '12:00');
  const [carrier, setCarrier] = useState(transport?.carrier ?? '');
  const [reference, setReference] = useState(transport?.reference ?? '');
  const [amount, setAmount] = useState(transport?.amount == null ? '' : String(transport.amount));
  const [currency, setCurrency] = useState(transport?.currency ?? '');
  const currencySearchRef = useRef<HTMLInputElement>(null);
  const selectedCurrency = currencies.find(option => option.value === currency)
    ?? (currency ? { value: currency, label: currency } : null);
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting.current) return;

    if (`${arrivalDate}T${arrivalTime}` < `${departureDate}T${departureTime}`) {
      setError('Arrival must be after departure.');
      return;
    }
    let cost: ReturnType<typeof itineraryCost>;
    try {
      cost = itineraryCost(amount, currency);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Please check the expense fields.');
      return;
    }

    submitting.current = true;
    setLoading(true);
    setError(null);
    try {
      const url = `${TRIP_API_URL}/trips/${tripId}/transports${isEditing ? `/${transport.id}` : ''}`;
      const res = await fetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({
          mode,
          fromDestinationId: from.id,
          toDestinationId: to.id,
          departureDate,
          departureTime,
          arrivalDate,
          arrivalTime,
          carrier: carrier.trim(),
          reference: reference.trim() || null,
          ...cost,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to save transport');
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  return (
    <div className='fixed inset-0 h-[100dvh] bg-black/30 z-50 flex justify-end'>
      <div className='w-full max-w-[420px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300' style={{ height: '100dvh' }}>
        <div className='flex shrink-0 justify-between items-center px-4 sm:px-6 py-4 border-b border-gray-100'>
          <h2 className='text-lg font-semibold text-gray-800'>{isEditing ? 'Update' : 'Add'} transport</h2>
          <button aria-label='Close transport form' disabled={loading} onClick={onClose} className='min-h-11 min-w-11 cursor-pointer text-gray-400 hover:text-gray-600 transition-colors disabled:cursor-not-allowed disabled:opacity-50'>X</button>
        </div>

        <form onSubmit={handleSubmit} id="transport-form" className='flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 py-5 flex flex-col gap-5'>
          {error && <p role="alert" className='rounded-lg border-red-200 bg-red-50 px-3 py-2 text-sm text-red-500'>{error}</p>}

          <div className='flex flex-col gap-1.5'>
            <span className={labelClass}>Route</span>
            <p className='rounded-xl border border-purple-100 bg-purple-50 px-3 py-2.5 text-sm font-semibold text-purple-800 break-words'>
              {from.city} <span className='text-purple-400'>→</span> {to.city}
            </p>
          </div>

          <div className='flex flex-col gap-1.5'>
            <span className={labelClass}>Type</span>
            <div className='flex flex-wrap gap-2'>
              {TRANSPORT_MODES.map(option => (
                <button key={option.value} type='button' aria-pressed={mode === option.value} onClick={() => setMode(option.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    mode === option.value ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200 hover:border-purple-400'
                  }`}>
                  {option.emoji} {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className='grid grid-cols-2 gap-3'>
            <div className='flex min-w-0 flex-col gap-1.5'>
              <label htmlFor='transport-departure-date' className={labelClass}>Departure</label>
              <input id='transport-departure-date' type='date' required value={departureDate} onChange={e => setDepartureDate(e.target.value)} className={fieldClass} />
            </div>
            <TransportTime label='Departure time' value={departureTime} onChange={setDepartureTime} />
            <div className='flex min-w-0 flex-col gap-1.5'>
              <label htmlFor='transport-arrival-date' className={labelClass}>Arrival</label>
              <input id='transport-arrival-date' type='date' required value={arrivalDate} onChange={e => setArrivalDate(e.target.value)} className={fieldClass} />
            </div>
            <TransportTime label='Arrival time' value={arrivalTime} onChange={setArrivalTime} />
          </div>

          <div className='flex flex-col gap-1.5'>
            <label htmlFor='transport-carrier' className={labelClass}>Company and number</label>
            <input id='transport-carrier' required value={carrier} onChange={e => setCarrier(e.target.value)} placeholder='Transavia TO 7647' className={fieldClass} />
          </div>

          <div className='flex flex-col gap-1.5'>
            <label htmlFor='transport-reference' className={labelClass}>Booking code (optional)</label>
            <input id='transport-reference' value={reference} onChange={e => setReference(e.target.value)} placeholder='X9HB3T' className={fieldClass} />
          </div>

          <fieldset className="min-w-0 space-y-3">
            <legend className="text-xs font-bold uppercase tracking-wide text-gray-500">Expense (optional)</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex min-w-0 flex-col gap-1.5">
                <label htmlFor='transport-amount' className={labelClass}>Amount</label>
                <input id='transport-amount' type="text" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 189.00" className={fieldClass} />
              </div>
              <div className="flex min-w-0 flex-col gap-1.5">
                <label htmlFor='transport-currency' className={labelClass}>Currency</label>
                <Combobox items={currencies} value={selectedCurrency} disabled={loading}
                  isItemEqualToValue={(option, selected) => option.value === selected.value}
                  onValueChange={option => setCurrency(option?.value ?? '')}>
                  <ComboboxTrigger id='transport-currency' type="button"
                    className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left text-sm text-gray-700 hover:border-purple-400 focus-visible:ring-2 focus-visible:ring-purple-400 disabled:cursor-not-allowed">
                    <span className="min-w-0 truncate"><ComboboxValue placeholder="Select currency" /></span>
                  </ComboboxTrigger>
                  <ComboboxContent initialFocus={currencySearchRef}>
                    <ComboboxInput ref={currencySearchRef} aria-label="Search currencies" placeholder="Search currencies..." showTrigger={false} />
                    <ComboboxEmpty>No currencies found.</ComboboxEmpty>
                    <ComboboxList>
                      {(option: { value: string; label: string }) => (
                        <ComboboxItem key={option.value} value={option} className="cursor-pointer data-highlighted:bg-purple-50 data-highlighted:text-purple-700">{option.label}</ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
                {(amount !== '' || currency !== '') && <button type="button"
                  onClick={() => { setAmount(''); setCurrency(''); setError(null); }}
                  className="cursor-pointer text-sm text-purple-600 hover:underline">Clear expense</button>}
              </div>
            </div>
          </fieldset>
        </form>

        <footer className='flex shrink-0 flex-wrap justify-between gap-2 border-t border-gray-100 px-4 sm:px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]'>
          <button className='flex items-center gap-1 px-5 py-3 text-gray-500 font-semibold rounded-full border cursor-pointer disabled:cursor-not-allowed disabled:opacity-50'
            disabled={loading} onClick={onClose}>Cancel</button>
          <button type='submit' form='transport-form' disabled={loading} aria-busy={loading}
            className='flex items-center gap-1 px-5 py-3 bg-purple-600 enabled:hover:bg-purple-700 text-white font-semibold rounded-full transition-colors cursor-pointer disabled:bg-gray-400 disabled:cursor-wait'>
            {loading ? 'Saving...' : `${isEditing ? 'Update' : 'Add'} transport`}
          </button>
        </footer>
      </div>
    </div>
  );
}
